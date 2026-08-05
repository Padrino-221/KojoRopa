"use server";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { rateLimit, rateLimitGlobal } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { logAudit } from "@/lib/audit";
import { createOrderNumber } from "@/lib/order";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/products";
import { orderSchema } from "@/lib/validators";
import type { OrderInput } from "@/lib/validators";

export type CreateOrderResult =
  | { ok: true; id: string; token: string }
  | { ok: false; error: string };

/**
 * Validates the order server-side, recomputes prices from the database
 * (never trusts the client) and stores it together with its line items.
 * Each order gets a high-entropy access token so receipts can only be viewed
 * by the person who just placed the order.
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
  const qtyBySlug = new Map<string, number>();
  let subtotal = 0;

  for (const line of items) {
    const product = bySlug.get(line.slug);
    if (!product) {
      return { ok: false, error: "One of the pieces is no longer available." };
    }
    if (!product.sizes.includes(line.size)) {
      return { ok: false, error: `We don't have that size for ${product.name}.` };
    }

    const nextQty = (qtyBySlug.get(line.slug) ?? 0) + line.qty;
    qtyBySlug.set(line.slug, nextQty);

    if (product.inventory !== null && nextQty > product.inventory) {
      // Deliberately vague — exact stock figures are not public information.
      return {
        ok: false,
        error: `Only a few ${product.name} left — try a smaller quantity.`,
      };
    }

    subtotal += product.price * line.qty;
  }

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
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

      for (const [slug, totalQty] of qtyBySlug.entries()) {
        const product = bySlug.get(slug)!;
        if (product.inventory !== null) {
          const updateResult = await tx.product.updateMany({
            where: {
              slug,
              inventory: { gte: totalQty },
            },
            data: {
              inventory: {
                decrement: totalQty,
              },
            },
          });

          if (updateResult.count !== 1) {
            throw new Error("Inventory changed during checkout");
          }
        }
      }
    });
  } catch {
    return { ok: false, error: "We couldn't place your order — try again." };
  }

  await logAudit("order.create", `order ${orderId} placed`, ip);
  return { ok: true, id: orderId, token };
}

export type OrderActionResult =
  | { ok: true }
  | { ok: false; error: string };

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
  }));
}
