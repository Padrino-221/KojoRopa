"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShirtArt } from "@/components/shirt-art";
import { ProductActions } from "@/components/product-actions";
import { ProductCard } from "@/components/product-card";
import { formatPrice, formatSavings } from "@/lib/format";
import { parseCategories, DEFAULT_CATEGORIES_RAW } from "@/lib/catalog";
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

  return (
    <div className="flex animate-fade-up flex-col gap-3 lg:sticky lg:top-24 lg:flex-row lg:items-start">
      {/* thumbnails — horizontal scroll on mobile, rail on desktop */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-all lg:h-[72px] lg:w-[72px] ${
                i === active
                  ? "border-clay"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* main image */}
      <div className="relative flex-1 overflow-hidden rounded-2xl bg-surface ring-1 ring-border/40">
        <div className="aspect-[3/4] lg:max-h-[600px]">
          {current ? (
            <img
              key={active}
              src={current}
              alt={`${product.name} photo ${active + 1}`}
              className="h-full w-full animate-fade-in object-cover"
            />
          ) : (
            <ShirtArt art={product.art} className="h-full w-full" />
          )}
        </div>

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
    </div>
  );
}

export function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const productDetailNote = useSiteSetting("productDetailNote", "Every piece is checked and one of one. When it's gone, it's gone.");
  const relatedHeading = useSiteSetting("relatedHeading", "You might also like");
  const categoriesRaw = useSiteSetting("categories", DEFAULT_CATEGORIES_RAW);
  const categoryLabel = useMemo(
    () =>
      parseCategories(categoriesRaw).find((c) => c.value === product.category)
        ?.label ?? product.category,
    [categoriesRaw, product.category]
  );
  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      {/* breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-[12px] text-taupe"
      >
        <Link href="/" className="transition-colors hover:text-clay">
          Shop
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/?category=${encodeURIComponent(product.category)}`}
          className="transition-colors hover:text-clay"
        >
          {categoryLabel}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-mocha">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-14">
        {/* gallery */}
        <ProductGallery key={product.id} product={product} images={images} />

        {/* info */}
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <p className="text-[11px] font-semibold tracking-[0.08em] text-clay uppercase">
            {categoryLabel}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight tracking-tight text-espresso sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold tabular-nums text-espresso">
              {formatPrice(product.price)}
            </span>
            {product.compareAt && (
              <>
                <span className="text-lg text-taupe line-through tabular-nums">
                  {formatPrice(product.compareAt)}
                </span>
                <span className="rounded-full bg-teal-light px-2.5 py-1 text-xs font-semibold text-clay">
                  {formatSavings(product.price, product.compareAt)} off retail
                </span>
              </>
            )}
          </div>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-teal-light px-3 py-1.5 text-xs font-semibold text-clay">
            <i className="ph-duotone ph-clock h-3.5 w-3.5" />
            Only 1 available — once it&apos;s gone, it&apos;s gone
          </div>

          <p className="mt-3 text-sm leading-relaxed text-mocha">
            {product.tagline}
          </p>

          <div className="my-5 h-px bg-sand" />

          <ProductActions product={product} />

          <p className="mt-5 flex items-center gap-2 text-[13px] text-mocha">
            {productDetailNote}
          </p>

          {/* trust signals */}
          <div className="mt-5 flex flex-col gap-3 border-y border-sand py-4 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-2">
            <span className="flex items-center gap-2 text-xs text-taupe">
              <i className="ph-duotone ph-shield-check h-3.5 w-3.5 shrink-0 text-clay" />
              Authenticated &amp; quality-checked
            </span>
            <span className="flex items-center gap-2 text-xs text-taupe">
              <i className="ph-duotone ph-heart h-3.5 w-3.5 shrink-0 text-clay" />
              One of a kind — no restocks
            </span>
          </div>
        </div>
      </div>

      {/* related */}
      <section className="mt-14">
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
