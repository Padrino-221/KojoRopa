import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { products as seedProducts } from "../src/lib/products";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env first.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg(connectionString),
  });

  let created = 0;
  let updated = 0;

  for (const p of seedProducts) {
    const data = {
      name: p.name,
      tagline: p.tagline,
      price: p.price,
      compareAt: p.compareAt ?? null,
      category: p.category,
      condition: p.condition,
      image: p.image ?? (p.images && p.images.length > 0 ? p.images[0] : null),
      images: p.images ?? [],
      story: p.story,
      sizes: p.sizes,
      featured: p.featured ?? false,
      visible: p.visible ?? true,
      artBase: p.art.base,
      artPattern: p.art.pattern,
      artAccent: p.art.accent ?? null,
      artAccent2: p.art.accent2 ?? null,
      artGraphic: p.art.graphic ?? null,
      artRib: p.art.rib ?? null,
    };

    const exists = await prisma.product.findUnique({
      where: { slug: p.slug },
      select: { id: true },
    });

    if (exists) {
      await prisma.product.update({ where: { slug: p.slug }, data });
      updated += 1;
    } else {
      await prisma.product.create({ data: { ...data, slug: p.slug } });
      created += 1;
    }
  }

  console.log(
    `Seeded ${created} new product(s), updated ${updated} existing.`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
