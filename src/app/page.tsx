import Link from "next/link";
import { Hero } from "@/components/hero";
import { Storefront } from "@/components/storefront";
import type { StorefrontInitial } from "@/components/storefront";
import { getPublicProducts } from "@/lib/queries";
import { CATEGORIES, SIZES } from "@/lib/products";
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

  const initial: StorefrontInitial = {
    q: pickString(qp.q, ""),
    category: CATEGORIES.some((c) => c.value === category) ? category : "all",
    size: SIZES.includes(size) ? size : "all",
    sort: pickString(qp.sort, "featured"),
  };

  return (
    <>
      <Hero />

      <Storefront initial={initial} products={products} />

      {/* story band */}
      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-12 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wide uppercase text-clay">
            {s.storyEyebrow || "Kantamanto-picked, Accra-worn"}
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl leading-tight tracking-tight text-espresso sm:text-3xl">
            {s.storyHeading || "Less than one shirt in ten makes it onto the rack"}
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mocha">
            {s.storyBody || "We dig through the secondhand bales at Kantamanto Market so you don't have to — washing, checking and pricing every piece honestly."}
          </p>
          <Link
            href="/about"
            className="mt-4 text-sm font-medium text-clay transition-colors hover:text-clay-deep"
          >
            Read our story →
          </Link>
        </div>
      </section>
    </>
  );
}
