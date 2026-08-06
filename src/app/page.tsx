import Link from "next/link";
import { Hero } from "@/components/hero";
import { Marquee } from "@/components/marquee";
import { Storefront } from "@/components/storefront";
import type { StorefrontInitial } from "@/components/storefront";
import { Reveal } from "@/components/ui/reveal";
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

  return (
    <>
      <Hero />

      <Marquee className="mt-10 lg:mt-14" />

      <Storefront initial={initial} products={products} />

      {/* story band */}
      <section className="border-t border-border bg-gradient-to-b from-linen to-cream/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Reveal className="flex flex-col items-center text-center">
            <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] text-clay uppercase">
              <span aria-hidden className="h-px w-8 bg-clay/60" />
              {s.storyEyebrow || "Hand-picked, Accra-worn"}
              <span aria-hidden className="h-px w-8 bg-clay/60" />
            </p>
            <h2 className="mt-4 max-w-2xl font-display text-3xl leading-tight tracking-tight text-balance text-espresso sm:text-4xl">
              {s.storyHeading || "Less than one shirt in ten makes it onto the rack"}
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-mocha sm:text-base">
              {s.storyBody || "We dig through the bales in Accra so you don't have to — checking and pricing every piece honestly."}
            </p>
            <Link
              href="/about"
              className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-clay transition-colors hover:text-clay-deep"
            >
              Read our story
              <span
                aria-hidden
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
