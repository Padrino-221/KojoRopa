import { revalidatePath } from "next/cache";
import type { EmailOrder } from "@/lib/email";

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

/** Maps a persisted order (with items) to the shape the email layer expects. */
function toEmailOrder(order: {
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
}): EmailOrder {
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
    items: order.items.map((i) => ({
      name: i.name,
      size: i.size,
      qty: i.qty,
      price: i.price,
    })),
  };
}

/**
 * Marks an order as paid end-to-end once payment is confirmed:
 *  - sets the status to "paid" (keeps "delivered" if already fulfilled)
 *  - records the Moolre transaction id
 *  - retires the one-of-one pieces from the rack
 *  - sends the customer receipt + admin notification (fire-and-forget)
 *
 * Idempotent — safe to call from the webhook, OTP submit and status-poll
 * paths whichever fires first. Emails are only sent the first time.
 */
export async function confirmOrderPayment(
  orderId: string,
  opts?: { ip?: string; transactionId?: string }
): Promise<{ confirmed: boolean; reason?: string }> {
  const { prisma } = await import("@/lib/db");
  const { logAudit } = await import("@/lib/audit");
  const { sendOrderConfirmation, sendAdminOrderNotification } = await import("@/lib/email");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { confirmed: false, reason: "order-not-found" };

  // Atomic claim: only ONE confirmation path (webhook / OTP / status poll)
  // can flip pending → paid. The others get zero affected rows and know to
  // stand down — this prevents double receipt emails under races.
  const claim = await prisma.order.updateMany({
    where: { id: orderId, status: { in: ["pending", "failed"] } },
    data: {
      status: "paid",
      ...(opts?.transactionId ? { moolreTransactionId: opts.transactionId } : {}),
    },
  });
  const firstConfirmation = claim.count > 0;

  const retired = await markOrderProductsSold(orderId, opts?.ip);
  revalidatePath("/", "layout");

  if (firstConfirmation) {
    await logAudit(
      "order.payment",
      `order ${orderId} payment confirmed — ${retired} piece(s) retired`,
      opts?.ip
    );

    const full = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (full) {
      const emailOrder = toEmailOrder(full);
      const [customer, admin] = await Promise.all([
        sendOrderConfirmation(emailOrder),
        sendAdminOrderNotification(emailOrder),
      ]);
      if (customer) {
        await logAudit("email.order_confirmation", `receipt emailed for order ${orderId}`, opts?.ip);
      }
      if (admin) {
        await logAudit("email.admin_notification", `new-order notification for ${orderId}`, opts?.ip);
      }
    }
  }

  return { confirmed: true };
}
