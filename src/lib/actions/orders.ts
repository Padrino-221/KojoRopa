"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitGlobal } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { logAudit } from "@/lib/audit";
import { createOrderNumber, markOrderProductsSold } from "@/lib/order";
import { orderSchema } from "@/lib/validators";
import type { OrderInput } from "@/lib/validators";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { initiatePayment, submitOtp, checkPaymentStatus } from "@/lib/moolre";
import {
  sendOrderConfirmation,
  sendAdminOrderNotification,
  sendDeliveryUpdate,
} from "@/lib/email";
import type { EmailOrder } from "@/lib/email";

export type { OrderStatus };

/** A persisted order including its line items. */
type OrderWithItems = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  street: string;
  city: string;
  postal: string;
  country: string;
  token: string | null;
  items: { name: string; size: string; qty: number; price: number }[];
};

/** Maps a persisted order to the shape the email layer expects. */
function toEmailOrder(order: OrderWithItems): EmailOrder {
  return {
    id: order.id,
    name: order.name,
    email: order.email,
    phone: order.phone,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    street: order.street,
    city: order.city,
    postal: order.postal,
    country: order.country,
    token: order.token,
    items: order.items,
  };
}

export type CreateOrderResult =
  | {
      ok: true;
      id: string;
      token: string;
      paymentMessage: string;
      sessionId: string | null;
      amount: number;
      phone: string;
    }
  | { ok: false; error: string };

/**
 * Validates the order server-side, recomputes prices from the database
 * (never trusts the client) and stores it together with its line items.
 * Each order gets a high-entropy access token so receipts can only be viewed
 * by the person who just placed the order.
 * After creating the order, initiates a Moolre Mobile Money payment.
 */
export async function createOrderAction(
  raw: OrderInput
): Promise<CreateOrderResult> {
  const ip = await getClientIp();
  if (
    !rateLimit(`order:${ip}`, 5, 60_000) ||
    !rateLimitGlobal("order", 30, 60_000)
  ) {
    return { ok: false, error: "Too many orders from this connection." };
  }

  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check your details and try again." };
  }
  const input = parsed.data;

  const normalizedItems = new Map<string, { slug: string; size: string; qty: number }>();
  for (const item of input.items) {
    const key = `${item.slug}::${item.size}`;
    const current = normalizedItems.get(key);
    if (current) {
      current.qty += item.qty;
    } else {
      normalizedItems.set(key, { ...item });
    }
  }

  const slugs = [...new Set([...normalizedItems.values()].map((item) => item.slug))];
  const dbProducts = await prisma.product.findMany({
    where: { slug: { in: slugs }, visible: true, sold: false },
  });
  const bySlug = new Map(dbProducts.map((p) => [p.slug, p]));

  const items = [...normalizedItems.values()];
  let subtotal = 0;

  for (const line of items) {
    const product = bySlug.get(line.slug);
    if (!product) {
      return { ok: false, error: "One of the pieces is no longer available." };
    }
    if (!product.sizes.includes(line.size)) {
      return { ok: false, error: `We don't have that size for ${product.name}.` };
    }

    subtotal += product.price * line.qty;
  }

  const deliveryFeeSetting = await prisma.siteSetting.findUnique({ where: { key: "deliveryFee" } });
  const deliveryFee = parseInt(deliveryFeeSetting?.value || "0", 10) || 0;
  const total = subtotal + deliveryFee;
  const orderId = createOrderNumber();
  const token = randomUUID();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.create({
        data: {
          id: orderId,
          token,
          email: input.email,
          name: input.name,
          phone: input.phone,
          subtotal,
          deliveryFee,
          total,
          street: input.address.street,
          city: input.address.city,
          postal: input.address.postal,
          country: input.address.country,
          items: {
            create: items.map((line) => {
              const product = bySlug.get(line.slug)!;
              return {
                slug: line.slug,
                name: product.name,
                size: line.size,
                price: product.price,
                qty: line.qty,
              };
            }),
          },
        },
      });
    });
  } catch {
    return { ok: false, error: "We couldn't place your order — try again." };
  }

  // Initiate Moolre Mobile Money payment
  const payment = await initiatePayment({
    phone: input.phone,
    amount: total,
    externalRef: orderId,
    reference: `Order ${orderId}`,
  });

  // Save Moolre session info to the order
  if (payment.sessionId || payment.transactionId) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        moolreSessionId: payment.sessionId || null,
        moolreTransactionId: payment.transactionId || null,
      },
    });
  }

  const paymentMessage = payment.success
    ? (payment.message || "Check your phone for the payment prompt.")
    : `Order placed but payment could not be initiated: ${payment.message || "Unknown error"}. You can retry payment from your order confirmation.`;

  await logAudit("order.create", `order ${orderId} placed (payment: ${payment.success ? "initiated" : "failed"})`, ip);

  return {
    ok: true,
    id: orderId,
    token,
    paymentMessage,
    sessionId: payment.sessionId || null,
    amount: total,
    phone: input.phone,
  };
}

export type OrderActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type SubmitOtpResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Submit OTP code for a pending Moolre payment.
 * Updates the order status based on payment result.
 */
export async function submitOtpAction(
  orderId: string,
  otpCode: string
): Promise<SubmitOtpResult> {
  const ip = await getClientIp();
  console.log(`[submitOtp] orderId=${orderId}, ip=${ip}`);

  if (!rateLimit(`otp:${orderId}`, 5, 60_000)) {
    console.log("[submitOtp] rate limited");
    return { ok: false, error: "Too many attempts. Please wait a moment." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    console.log("[submitOtp] order not found");
    return { ok: false, error: "Order not found." };
  }

  console.log(`[submitOtp] order found: sessionId=${order.moolreSessionId}, transactionId=${order.moolreTransactionId}, phone=${order.phone}`);

  // Use sessionId if available, otherwise fall back to transactionId
  const sessionId = order.moolreSessionId || order.moolreTransactionId || "";

  const result = await submitOtp({
    phone: order.phone || "",
    amount: order.total,
    externalRef: order.id,
    otpCode,
    sessionId,
    transactionId: order.moolreTransactionId || undefined,
  });

  console.log("[submitOtp] moolre result:", result);

  if (result.success) {
    // Payment confirmed — the order stays "pending" until the admin marks it
    // "delivered", so the status reflects fulfilment, not payment.
    await prisma.order.update({
      where: { id: orderId },
      data: {
        moolreTransactionId: result.transactionId || order.moolreTransactionId,
      },
    });

    // One-of-one pieces in this order are now sold — retire them from the rack.
    await markOrderProductsSold(orderId, ip);
    revalidatePath("/", "layout");

    await logAudit("order.payment", `order ${orderId} payment confirmed`, ip);

    // Send the receipt to the buyer and a heads-up to the shop owner.
    // Fire-and-forget: failures are logged in the email layer, never thrown.
    const full = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (full) {
      const orderForEmail = toEmailOrder(full);
      const [customer, admin] = await Promise.all([
        sendOrderConfirmation(orderForEmail),
        sendAdminOrderNotification(orderForEmail),
      ]);
      if (customer) {
        await logAudit("email.order_confirmation", `receipt emailed for order ${orderId}`, ip);
      }
      if (admin) {
        await logAudit("email.admin_notification", `new-order notification for ${orderId}`, ip);
      }
    }

    return { ok: true, message: result.message || "Payment confirmed!" };
  }

  return { ok: false, error: result.message || "OTP verification failed. Please try again." };
}

export type CheckPaymentResult =
  | { ok: true; paid: boolean; status: string }
  | { ok: false; error: string };

/**
 * Re-initiate a Moolre payment for an existing pending order.
 * Used when the initial payment initiation failed or the USSD prompt expired.
 */
export async function retryPaymentAction(
  orderId: string
): Promise<CheckPaymentResult> {
  const ip = await getClientIp();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { ok: false, error: "Order not found." };
  }
  if (!order.phone) {
    return { ok: false, error: "No phone number on this order." };
  }

  const payment = await initiatePayment({
    phone: order.phone,
    amount: order.total,
    externalRef: order.id,
    reference: `Order ${order.id}`,
  });

  if (!payment.success) {
    return { ok: false, error: payment.message || "Payment could not be initiated." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      moolreSessionId: payment.sessionId || null,
      moolreTransactionId: payment.transactionId || null,
    },
  });

  await logAudit("order.payment", `order ${orderId} payment re-initiated`, ip);
  return { ok: true, paid: false, status: "pending" };
}

/**
 * Check the payment status for an order via Moolre.
 */
export async function checkPaymentAction(
  orderId: string
): Promise<CheckPaymentResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  if (!order.moolreSessionId && !order.moolreTransactionId) {
    return { ok: false, error: "No transaction to check." };
  }

  const result = await checkPaymentStatus({
    externalRef: order.id,
  });

  if (result.success) {
    // Payment confirmed — keep the order "pending"; only the admin marks it
    // "delivered" once it's actually fulfilled. The pieces are now sold.
    await markOrderProductsSold(orderId);
    revalidatePath("/", "layout");
    return { ok: true, paid: true, status: "pending" };
  }

  return { ok: false, error: result.message || "Payment not yet confirmed." };
}

/** Admin-only: permanently deletes an order and its items (PII erasure). */
export async function deleteOrderAction(id: string): Promise<OrderActionResult> {
  const ip = await getClientIp();
  const { isAdmin } = await import("@/lib/auth");
  if (!(await isAdmin())) {
    return { ok: false, error: "You need to sign in again." };
  }
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "That order no longer exists." };
  }
  await prisma.order.delete({ where: { id } });
  await logAudit("order.delete", `order ${id} deleted`, ip);
  return { ok: true };
}

/** Admin-only: update an order's status. */
export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus
): Promise<OrderActionResult> {
  const ip = await getClientIp();
  const { isAdmin } = await import("@/lib/auth");
  if (!(await isAdmin())) {
    return { ok: false, error: "You need to sign in again." };
  }
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status." };
  }
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "That order no longer exists." };
  }
  await prisma.order.update({ where: { id }, data: { status } });
  await logAudit("order.status", `order ${id} → ${status}`, ip);

  // When a piece is marked delivered, tell the buyer.
  if (status === "delivered") {
    const full = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (full) {
      const sent = await sendDeliveryUpdate(toEmailOrder(full));
      if (sent) {
        await logAudit("email.delivery", `delivery update emailed for order ${id}`, ip);
      }
    }
  }

  return { ok: true };
}

/** Admin-only: latest orders for the dashboard (supports manual refresh). */
export async function getOrdersAction() {
  const { isAdmin } = await import("@/lib/auth");
  if (!(await isAdmin())) {
    return [];
  }
  const rows = await prisma.order.findMany({
    include: { items: true },
    orderBy: { placedAt: "desc" },
  });
  return rows.map((row) => ({
    ...row,
    placedAt: row.placedAt.toISOString(),
    status: row.status as OrderStatus,
  }));
}
