"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { slugify } from "@/lib/products";
import { productSchema } from "@/lib/validators";
import type { ProductInput } from "@/lib/validators";
import { dbToProduct, productInputToDbShape } from "@/lib/product-mapper";
import type { Product } from "@/lib/products";

export type ProductActionResult =
  | { ok: true; product: Product }
  | { ok: false; error: string };

async function ensureAdmin(): Promise<boolean> {
  return isAdmin();
}

async function slugExists(slug: string): Promise<boolean> {
  return (
    (await prisma.product.findUnique({
      where: { slug },
      select: { slug: true },
    })) !== null
  );
}

async function uniqueSlug(base: string, taken?: string): Promise<string> {
  let slug = base;
  let i = 2;
  while ((await slugExists(slug)) || slug === taken) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

export async function createProductAction(
  raw: ProductInput
): Promise<ProductActionResult> {
  if (!(await ensureAdmin())) {
    return { ok: false, error: "You need to sign in again." };
  }
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Some fields didn't pass validation." };
  }

  const slug = await uniqueSlug(slugify(parsed.data.name) || "item");
  const row = await prisma.product.create({
    data: { ...productInputToDbShape(parsed.data), slug },
  });

  await logAudit("product.create", `created "${row.name}" (${slug})`, await getClientIp());

  revalidatePath("/", "layout");
  return { ok: true, product: dbToProduct(row) };
}

export async function updateProductAction(
  slug: string,
  raw: ProductInput
): Promise<ProductActionResult> {
  if (!(await ensureAdmin())) {
    return { ok: false, error: "You need to sign in again." };
  }
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (!existing) {
    return { ok: false, error: "That piece no longer exists." };
  }

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Some fields didn't pass validation." };
  }

  const nextSlug =
    parsed.data.name !== existing.name
      ? await uniqueSlug(slugify(parsed.data.name) || "item", existing.slug)
      : slug;

  const row = await prisma.product.update({
    where: { slug },
    data: { ...productInputToDbShape(parsed.data), slug: nextSlug },
  });

  await logAudit(
    "product.update",
    `updated "${row.name}" (${row.slug})`,
    await getClientIp()
  );

  revalidatePath("/", "layout");
  return { ok: true, product: dbToProduct(row) };
}

export async function deleteProductAction(
  slug: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await ensureAdmin())) {
    return { ok: false, error: "You need to sign in again." };
  }
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (!existing) {
    return { ok: false, error: "That piece no longer exists." };
  }
  await prisma.product.delete({ where: { slug } });
  await logAudit(
    "product.delete",
    `deleted "${existing.name}" (${slug})`,
    await getClientIp()
  );
  revalidatePath("/", "layout");
  return { ok: true };
}
