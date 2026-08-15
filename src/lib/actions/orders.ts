"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitGlobal } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { logAudit } from "@/lib/audit";
import { createOrderNumber, confirmOrderPayment } from "@/lib/order";
import { orderSchema } from "@/lib/validators";
import type { OrderInput } from "@/lib/validators";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { initiatePayment, submitOtp, checkPaymentStatus } from "@/lib/moolre";
import { sendDeliveryUpdate } from "@/lib/email";
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

  const payDetail = payment.success ? "initiated" : `failed: ${payment.technical || payment.message || "unknown"}`;
  await logAudit(
    "order.create",
    `order ${orderId} placed (payment: ${payDetail}; moolre: ${payment.gatewayDetail || "n/a"})`,
    ip
  );

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
  | { ok: false; error: string; pending?: boolean };

/**
 * Loads an order and verifies the caller presents its unguessable token.
 * Payment-mutating actions must only ever be driven by the buyer who holds
 * the order token — the order id alone is too guessable to authorize changes.
 */
async function findOrderForAction(orderId: string, token: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.token || order.token !== token) return null;
  return order;
}

/**
 * Submit OTP code for a pending Moolre payment (requires the order token).
 * On success the order is flipped to "paid"; it only becomes "delivered"
 * once the admin marks it fulfilled.
 */
export async function submitOtpAction(
  orderId: string,
  token: string,
  otpCode: string
): Promise<SubmitOtpResult> {
  const ip = await getClientIp();

  if (
    !rateLimit(`otp:${orderId}`, 5, 60_000) ||
    !rateLimitGlobal("otp", 120, 60_000)
  ) {
    return { ok: false, error: "Too many attempts. Please wait a moment." };
  }

  const order = await findOrderForAction(orderId, token);
  if (!order) {
    return { ok: false, error: "Order not found." };
  }
  if (order.status === "paid" || order.status === "delivered") {
    return { ok: true, message: "This order is already paid." };
  }

  // Use sessionId if available, otherwise fall back to transactionId
  // (submitOtp itself ignores placeholder values like "all").
  const sessionId = order.moolreSessionId || order.moolreTransactionId || "";

  const result = await submitOtp({
    phone: order.phone || "",
    amount: order.total,
    externalRef: order.id,
    otpCode,
    sessionId,
    transactionId: order.moolreTransactionId || undefined,
  });

  if (result.success) {
    // Trust, but verify: a successful OTP response must ALSO be confirmed by
    // Moolre's status endpoint before the order flips to "paid". Moolre can
    // answer status:1 with codes that are NOT a charge (TP14/TP17), so the
    // status endpoint is the server-to-server source of truth — this mirrors
    // the webhook's re-verification rule.
    const verification = await checkPaymentStatus({ externalRef: order.id });
    if (!verification.success) {
      const reason = verification.technical
        ? `status check errored: ${verification.technical}`
        : `status ${verification.code || "pending"}`;
      await logAudit(
        "order.payment",
        `order ${orderId} OTP accepted (submit code: ${result.code || "?"}) but Moolre ${reason} — NOT marked paid yet; submit envelope: ${result.gatewayDetail || "n/a"}; status envelope: ${verification.gatewayDetail || "n/a"}`,
        ip
      );
      return {
        ok: false,
        pending: true,
        error: "Check your phone for the payment prompt and approve with your Mobile Money PIN.",
      };
    }
    await confirmOrderPayment(orderId, {
      ip,
      transactionId: verification.transactionId || result.transactionId || order.moolreTransactionId || undefined,
    });
    return { ok: true, message: result.message || "Payment confirmed!" };
  }

  if (result.technical) {
    await logAudit("order.payment", `order ${orderId} OTP submit failed: ${result.technical}`, ip);
  }
  if (result.code === "TP14" && result.requiresOtp) {
    // Two ways to land here: the entered code was wrong/expired, or the
    // post-TP17 re-issue asked for a fresh code. Either way a new SMS has
    // been (or will be) dispatched and no charge was made.
    await logAudit(
      "order.payment",
      `order ${orderId} OTP rejected by Moolre (TP14) — new code required; no charge made; envelope: ${result.gatewayDetail || "n/a"}`,
      ip
    );
    return { ok: false, error: result.message || "OTP verification failed. Please try again." };
  }
  if (result.code === "TP17") {
    await logAudit(
      "order.payment",
      `order ${orderId} phone verified (TP17) but Moolre did not create a charge — order stays pending; envelope: ${result.gatewayDetail || "n/a"}`,
      ip
    );
    // Phone verified but no transaction yet — treat as pending (the client
    // swaps to the confirming notice and the status poll takes over).
    return { ok: false, pending: true, error: result.message || "OTP verification failed. Please try again." };
  }
  // Any other non-success outcome (e.g. TP13 duplicate-reference on the
  // post-TP17 re-issue, unexpected codes, etc.) is logged with the full
  // envelope so the admin trail always shows what Moolre answered.
  await logAudit(
    "order.payment",
    `order ${orderId} OTP submit not confirmed (code: ${result.code || "?"}) — no charge made; envelope: ${result.gatewayDetail || "n/a"}`,
    ip
  );
  return { ok: false, error: result.message || "OTP verification failed. Please try again." };
}

export type CheckPaymentResult =
  | { ok: true; paid: boolean; status: string }
  | { ok: false; error: string };

/**
 * Re-initiate a Moolre payment for an existing pending order (requires the
 * order token). Used when the initial initiation failed or the USSD prompt
 * expired. Blocked once an order is already paid — no double-charging.
 */
export async function retryPaymentAction(
  orderId: string,
  token: string
): Promise<CheckPaymentResult> {
  const ip = await getClientIp();

  if (
    !rateLimit(`retry:${orderId}`, 3, 60_000) ||
    !rateLimitGlobal("payment-retry", 30, 60_000)
  ) {
    return { ok: false, error: "Too many retries. Please wait a moment." };
  }

  const order = await findOrderForAction(orderId, token);
  if (!order) {
    return { ok: false, error: "Order not found." };
  }
  if (order.status === "paid" || order.status === "delivered") {
    return { ok: false, error: "This order is already paid — no retry needed." };
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
    await logAudit(
      "order.payment",
      `order ${orderId} retry failed: ${payment.technical || payment.message || "unknown"}`,
      ip
    );
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
 * Check the payment status for an order via Moolre (requires the order token).
 * Confirms the order (flips it to "paid") when Moolre reports it paid.
 */
export async function checkPaymentAction(
  orderId: string,
  token: string
): Promise<CheckPaymentResult> {
  const ip = await getClientIp();

  if (
    !rateLimit(`check:${orderId}`, 30, 60_000) ||
    !rateLimitGlobal("payment-check", 600, 60_000)
  ) {
    return { ok: false, error: "Too many requests. Please wait a moment." };
  }

  const order = await findOrderForAction(orderId, token);
  if (!order) {
    return { ok: false, error: "Order not found." };
  }
  if (order.status === "paid" || order.status === "delivered") {
    return { ok: true, paid: true, status: order.status };
  }

  if (!order.moolreSessionId && !order.moolreTransactionId) {
    return { ok: false, error: "No transaction to check." };
  }

  const result = await checkPaymentStatus({
    externalRef: order.id,
  });

  if (result.success) {
    await confirmOrderPayment(orderId, {
      ip,
      transactionId: result.transactionId || order.moolreTransactionId || undefined,
    });
    return { ok: true, paid: true, status: "paid" };
  }

  if (result.technical) {
    await logAudit("order.payment", `order ${orderId} status check failed: ${result.technical}`, ip);
  } else {
    await logAudit(
      "order.payment",
      `order ${orderId} status check: ${result.code || "?"} — ${result.message || "not confirmed"}; envelope: ${result.gatewayDetail || "n/a"}`,
      ip
    );
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
