import Link from "next/link";
import { ShirtArt } from "@/components/shirt-art";
import { getPublicProducts } from "@/lib/queries";
import { products } from "@/lib/products";
import type { Product } from "@/lib/products";
import { getAllSettings } from "@/lib/actions/settings";

function pickHeroShirt(rack: Product[], rotationMs: number, now = Date.now()): Product {
  if (rack.length === 0) return products[0];
  const index = Math.floor(now / rotationMs) % rack.length;
  return rack[index];
}

export async function Hero() {
  const [rack, settings] = await Promise.all([getPublicProducts(), getAllSettings()]);
  const rotationMs = parseInt(settings.heroRotationMs || "21600000", 10) || 21600000;
  const main = pickHeroShirt(rack, rotationMs);

  return (
    <section className="relative overflow-hidden">
      {/* ambient colour wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-clay/[0.07] blur-3xl" />
        <div className="absolute -bottom-48 -left-24 h-[26rem] w-[26rem] rounded-full bg-espresso/[0.04] blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-14">
        <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-br from-white via-cream/50 to-clay/[0.03]">
          <div className="grid items-center gap-10 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:px-16 lg:py-16">
            {/* copy */}
            <div className="animate-fade-up">
              <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.22em] text-clay uppercase">
                <span aria-hidden className="h-px w-8 bg-clay/60" />
                {settings.heroEyebrow || "Curated secondhand · Accra"}
              </p>
              <h1 className="mt-5 font-display text-5xl leading-[1.02] tracking-tight text-balance text-espresso sm:text-6xl lg:text-7xl">
                {settings.heroHeadline || "Transform Your Style with Confidence."}
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-mocha sm:text-lg">
                {settings.heroDescription || "KojoRopa picks one-of-one secondhand shirts from the bales at Kantamanto Market — washed, checked and priced to move."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/#shop"
                  className="group inline-flex items-center gap-2 rounded-full bg-espresso px-8 py-4 text-sm font-medium text-white transition-all duration-300 hover:bg-clay"
                >
                  Shop Now
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center rounded-full border border-sand-deep bg-white px-8 py-4 text-sm font-medium text-espresso transition-all duration-300 hover:border-clay/50 hover:bg-cream"
                >
                  Our Story
                </Link>
              </div>

              {/* trust row */}
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-6 text-[13px] text-mocha">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-clay" />
                  One of one, no restocks
                </span>
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-clay" />
                  Washed &amp; checked
                </span>
              </div>
            </div>

            {/* single piece */}
            <div className="relative animate-fade-up" style={{ animationDelay: "120ms" }}>
              <div className="relative mx-auto aspect-[4/5] w-full max-w-sm lg:max-w-none">
                <div
                  aria-hidden
                  className="absolute -inset-1.5 rounded-[2.2rem] border border-clay/15"
                />
                <Link
                  href={`/product/${main.slug}`}
                  className="group relative block h-full w-full overflow-hidden rounded-[2rem] bg-white ring-1 ring-border/50"
                >
                  {main.image ? (
                    <img
                      src={main.image}
                      alt={main.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  ) : (
                    <ShirtArt
                      art={main.art}
                      className="absolute top-1/2 left-1/2 h-[85%] w-[85%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  )}
                  <span className="absolute top-4 right-4 rounded-full bg-espresso/85 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-white uppercase backdrop-blur">
                    Pick of the rack
                  </span>
                  <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.18em] text-espresso uppercase backdrop-blur">
                    {main.condition}
                  </span>
                </Link>
              </div>
              <p className="mt-4 text-center text-xs tracking-[0.16em] text-taupe uppercase">
                {settings.heroCaption || "The pick of the rack — one of one, no restocks"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
