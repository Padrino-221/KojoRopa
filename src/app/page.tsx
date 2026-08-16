import { Storefront } from "@/components/storefront";
import type { StorefrontInitial } from "@/components/storefront";
import { getPublicProducts } from "@/lib/queries";
import { parseCategories, parseSizes } from "@/lib/catalog";
import { getAllSettings } from "@/lib/actions/settings";

export default async function HomePage(props: PageProps<"/">) {
  const qp = await props.searchParams;
  const [products, s] = await Promise.all([getPublicProducts(), getAllSettings()]);

  const pickString = (
    value: string | string[] | undefined,
    fallback: string
  ): string => (typeof value === "string" ? value : fallback);

  const category = pickString(qp.category, "");
  const size = pickString(qp.size, "");
  const categories = parseCategories(s.categories);
  const sizes = parseSizes(s.sizes);

  const initial: StorefrontInitial = {
    q: pickString(qp.q, ""),
    category: categories.some((c) => c.value === category) ? category : "all",
    size: sizes.includes(size) ? size : "all",
    sort: pickString(qp.sort, "featured"),
  };

  return <Storefront initial={initial} products={products} />;
}
