export interface OrderLine {
  slug: string;
  name: string;
  size: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  placedAt: string;
  email: string;
  name: string;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  address: {
    street: string;
    city: string;
    postal: string;
    country: string;
  };
}

const ORDER_PREFIX = process.env.NEXT_PUBLIC_ORDER_PREFIX ?? "KR-";

export function createOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.floor(Math.random() * 1296) // 36^2
    .toString(36)
    .toUpperCase()
    .padStart(2, "0");
  return `${ORDER_PREFIX}${ts}${rand}`;
}

/**
 * Retires every product in an order from the rack once payment is confirmed.
 * One-of-one pieces: the first confirmed payment wins. Idempotent — safe to
 * call from the webhook, OTP submit and status-poll paths whichever fires first.
 */
export async function markOrderProductsSold(
  orderId: string,
  ip?: string
): Promise<number> {
  const { prisma } = await import("@/lib/db");
  const { logAudit } = await import("@/lib/audit");

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { slug: true },
  });
  const slugs = [...new Set(items.map((i) => i.slug))];
  if (slugs.length === 0) return 0;

  const res = await prisma.$transaction(async (tx) => {
    return tx.product.updateMany({
      where: { slug: { in: slugs } },
      data: { sold: true },
    });
  });

  if (res.count > 0) {
    await logAudit(
      "order.sold",
      `order ${orderId} → ${res.count} piece(s) retired from the rack (${slugs.join(", ")})`,
      ip
    );
  }

  return res.count;
}
