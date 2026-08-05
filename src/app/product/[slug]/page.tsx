import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { getPublicProducts } from "@/lib/queries";

export async function generateMetadata(
  props: PageProps<"/product/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getPublicProducts().then((all) =>
    all.find((p) => p.slug === slug)
  );
  if (!product) return {};
  return {
    title: product.name,
    description: product.tagline,
  };
}

export default async function ProductPage(
  props: PageProps<"/product/[slug]">
) {
  const { slug } = await props.params;
  const all = await getPublicProducts();
  const product = all.find((p) => p.slug === slug);
  if (!product) notFound();

  const related = all
    .filter((p) => p.slug !== product.slug)
    .map((p) => ({
      product: p,
      score:
        (p.category === product.category ? 2 : 0) +
        p.tags.filter((t) => product.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ product: p }) => p);

  return <ProductDetail product={product} related={related} />;
}
