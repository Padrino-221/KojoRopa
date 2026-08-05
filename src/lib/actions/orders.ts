"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitGlobal } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { logAudit } from "@/lib/audit";
import { createOrderNumber } from "@/lib/order";
import { orderSchema } from "@/lib/validators";
import type { OrderInput } from "@/lib/validators";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { initiatePayment, submitOtp, checkPaymentStatus } from "@/lib/moolre";

export type { OrderStatus };

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
    where: { slug: { in: slugs }, visible: true },
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

  const shippingSetting = await prisma.siteSetting.findUnique({ where: { key: "shippingFee" } });
  const shipping = parseInt(shippingSetting?.value || "0", 10) || 0;
  const total = subtotal + shipping;
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
          shipping,
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

  if (!order.moolreSessionId) {
    console.log("[submitOtp] no moolreSessionId — cannot submit OTP");
    return { ok: false, error: "No pending payment for this order. The initial payment may not have been initiated." };
  }

  const result = await submitOtp({
    phone: order.phone || "",
    amount: order.total,
    externalRef: order.id,
    otpCode,
    sessionId: order.moolreSessionId,
    transactionId: order.moolreTransactionId || undefined,
  });

  console.log("[submitOtp] moolre result:", result);

  if (result.success) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "delivered",
        moolreTransactionId: result.transactionId || order.moolreTransactionId,
      },
    });
    await logAudit("order.payment", `order ${orderId} payment confirmed`, ip);
    return { ok: true, message: result.message || "Payment confirmed!" };
  }

  return { ok: false, error: result.message || "OTP verification failed. Please try again." };
}

export type CheckPaymentResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

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

  if (!order.moolreTransactionId) {
    return { ok: false, error: "No transaction to check." };
  }

  const result = await checkPaymentStatus({
    transactionId: order.moolreTransactionId,
  });

  if (result.success) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "delivered" },
    });
    return { ok: true, status: "delivered" };
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
