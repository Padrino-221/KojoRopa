"use client";

import { useState } from "react";
import Link from "next/link";
import { ShirtArt } from "@/components/shirt-art";
import { ProductActions } from "@/components/product-actions";
import { ProductCard } from "@/components/product-card";
import { formatPrice, formatSavings } from "@/lib/format";
import type { Product } from "@/lib/products";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Reveal } from "@/components/ui/reveal";

function ProductGallery({
  product,
  images,
}: {
  product: Product;
  images: string[];
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? null;

  const prev = () => setActive((a) => (a - 1 + images.length) % images.length);
  const next = () => setActive((a) => (a + 1) % images.length);

  return (
    <div className="animate-fade-up">
      <div className="relative overflow-hidden rounded-3xl bg-surface ring-1 ring-border/40">
        <div className="aspect-square">
          {current ? (
            <img
              key={active}
              src={current}
              alt={`${product.name} photo ${active + 1}${
                images.length > 1 ? ` of ${images.length}` : ""
              }`}
              className="h-full w-full animate-fade-in object-cover"
            />
          ) : (
            <ShirtArt art={product.art} className="h-full w-full" />
          )}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-espresso ring-1 ring-border backdrop-blur transition-colors hover:bg-white hover:text-clay"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-espresso ring-1 ring-border backdrop-blur transition-colors hover:bg-white hover:text-clay"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-espresso/70 px-2.5 py-1 text-[11px] font-medium tabular-nums text-white">
              {active + 1} / {images.length}
            </span>
          </>
        )}

        <div className="absolute top-4 left-4 flex flex-col items-start gap-1.5">
          {product.condition === "Deadstock" && (
            <span className="rounded-full bg-clay px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-white">
              Deadstock
            </span>
          )}
          {product.compareAt && (
            <span className="rounded-full bg-clay px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase text-white">
              {formatSavings(product.price, product.compareAt)}
            </span>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-16 overflow-hidden rounded-xl ring-2 transition-all ${
                i === active
                  ? "ring-clay"
                  : "ring-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-center text-xs tracking-wide text-taupe">
        {product.condition}
      </p>
    </div>
  );
}

const SPECS: { label: string; get: (p: Product) => string | undefined }[] = [
  { label: "Condition", get: (p) => p.condition },
];

export function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const productDetailNote = useSiteSetting("productDetailNote", "Every piece is checked and one of one. When it's gone, it's gone.");
  const relatedHeading = useSiteSetting("relatedHeading", "You might also like");
  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-[13px] text-taupe"
      >
        <Link href="/" className="transition-colors hover:text-espresso">
          Home
        </Link>
        <span aria-hidden>/</span>
        <Link href="/#shop" className="transition-colors hover:text-espresso">
          Shop
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-mocha">{product.name}</span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* gallery */}
        <ProductGallery key={product.id} product={product} images={images} />

        {/* info */}
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-medium text-mocha">
              {product.condition}
            </span>
            <span className="rounded-full bg-cream px-3 py-1 text-[11px] font-medium text-mocha">
              Size {product.sizes.join(", ")}
            </span>
          </div>

          <h1 className="mt-4 font-display text-3xl leading-tight tracking-tight text-espresso sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 text-lg text-mocha italic">{product.tagline}</p>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl tabular-nums text-espresso">
              {formatPrice(product.price)}
            </span>
            {product.compareAt && (
              <>
                <span className="text-lg text-taupe line-through tabular-nums">
                  {formatPrice(product.compareAt)}
                </span>
                <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
                  {formatSavings(product.price, product.compareAt)} off retail
                </span>
              </>
            )}
          </div>

          <p className="mt-5 leading-relaxed text-mocha">
            {product.story}
          </p>

          <ProductActions product={product} />

          {/* specs accordion */}
          <div className="mt-8 divide-y divide-border border-y border-border">
            {SPECS.map((spec) => (
              <details key={spec.label} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-espresso">
                  {spec.label}
                  <span className="text-taupe transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pt-2 pb-1 text-sm text-mocha">
                  {spec.get(product)}
                </p>
              </details>
            ))}
          </div>

          <p className="mt-5 flex items-center gap-2 text-[13px] text-mocha">
            {productDetailNote}
          </p>
        </div>
      </div>

      {/* related */}
      <section className="mt-16">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl tracking-tight text-espresso sm:text-3xl">
            {relatedHeading}
          </h2>
          <Link
            href="/#shop"
            className="text-sm text-clay transition-colors hover:text-clay-deep"
          >
            See all
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {related.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 7) * 60}>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
