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
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-12">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-clay/8 via-linen to-clay/5">
        <div className="grid items-center gap-8 px-5 py-8 sm:px-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:px-14">
          {/* copy */}
          <div className="animate-fade-up">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-clay">
              {settings.heroEyebrow || "Curated secondhand · Accra"}
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] tracking-tight text-espresso sm:text-5xl lg:text-6xl">
              {settings.heroHeadline || "Transform Your Style with Confidence."}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-mocha">
              {settings.heroDescription || "KojoRopa picks one-of-one secondhand shirts from the bales at Kantamanto Market — washed, checked and priced to move."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/#shop"
                className="rounded-full bg-espresso px-7 py-3.5 text-sm font-medium text-white transition-all hover:bg-clay hover:shadow-lg hover:shadow-clay/20"
              >
                Shop Now
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-sand-deep bg-white px-7 py-3.5 text-sm font-medium text-espresso transition-all hover:border-clay/40 hover:bg-cream"
              >
                Our Story
              </Link>
            </div>
          </div>

          {/* single piece */}
          <div className="relative animate-fade-up" style={{ animationDelay: "100ms" }}>
            <Link
              href={`/product/${main.slug}`}
              className="group relative mx-auto block aspect-[4/5] w-full max-w-xs overflow-hidden rounded-3xl bg-white shadow-xl shadow-clay/5 lg:max-w-none"
            >
              {main.image ? (
                <img
                  src={main.image}
                  alt={main.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <ShirtArt
                  art={main.art}
                  className="absolute top-1/2 left-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-500 group-hover:scale-105"
                />
              )}
            </Link>
            <p className="mt-3 text-center text-xs tracking-wide text-taupe">
              {settings.heroCaption || "The pick of the rack — one of one, no restocks"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
