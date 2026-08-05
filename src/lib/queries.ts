import "server-only";
import { prisma } from "@/lib/db";
import { dbToProduct } from "@/lib/product-mapper";

/** Visible products, featured first, newest first — the public rack. */
export async function getPublicProducts() {
  const rows = await prisma.product.findMany({
    where: { visible: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(dbToProduct);
}

export async function getProductBySlug(slug: string) {
  const row = await prisma.product.findFirst({
    where: { slug, visible: true },
  });
  return row ? dbToProduct(row) : null;
}

/** Every product including hidden ones, newest first — for the admin rack. */
export async function getAdminProducts() {
  const rows = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(dbToProduct);
}

export async function getOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
}

/** Public receipt lookup — only reachable with the order's unguessable token. */
export async function getOrderByToken(token: string) {
  return prisma.order.findUnique({
    where: { token },
    include: { items: true },
  });
}

/** Top-selling slugs ranked by total quantity ordered. */
export async function getBestSellingSlugs(limit = 4) {
  const rows = await prisma.orderItem.groupBy({
    by: ["slug"],
    _sum: { qty: true },
    orderBy: { _sum: { qty: "desc" } },
    take: limit,
  });
  return rows.map((r) => r.slug);
}

/** All orders with items, newest first — for the admin dashboard. */
export async function getAdminOrders() {
  const rows = await prisma.order.findMany({
    include: { items: true },
    orderBy: { placedAt: "desc" },
  });
  return rows.map((row) => ({
    ...row,
    status: row.status as "pending" | "delivered" | "failed",
  }));
}
