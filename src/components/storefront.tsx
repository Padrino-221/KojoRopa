"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES, SIZES, STYLE_FILTERS } from "@/lib/products";
import type { Product } from "@/lib/products";
import { useSiteSetting } from "@/components/site-settings-provider";
import { CustomSelect } from "@/components/ui/custom-select";

export interface StorefrontInitial {
  q: string;
  category: string;
  style: string;
  size: string;
  sort: string;
}

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price · low to high" },
  { value: "price-desc", label: "Price · high to low" },
  { value: "newest", label: "Newest finds" },
];

export function Storefront({
  initial,
  products,
  bestSellingSlugs = [],
}: {
  initial: StorefrontInitial;
  products: Product[];
  bestSellingSlugs?: string[];
}) {
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [style, setStyle] = useState(initial.style);
  const [size, setSize] = useState(initial.size);
  const [sort, setSort] = useState(initial.sort);

  const storeHeading = useSiteSetting("storeHeading", "Popular of the week");
  const bestSellerHeading = useSiteSetting("bestSellerHeading", "Best Seller");
  const popularHeading = useSiteSetting("popularHeading", "Popular Items");
  const emptyHeading = useSiteSetting("emptyHeading", "Nothing on this hanger");
  const emptyBody = useSiteSetting("emptyBody", "No pieces match those filters right now. Loosen a filter or two — the rack turns over every week.");

  const result = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = products
      .filter((p) => p.visible !== false)
      .filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (style !== "all" && !p.tags.includes(style)) return false;
      if (size !== "all" && !p.sizes.includes(size)) return false;
      if (query) {
        const haystack = [
          p.name,
          p.tagline,
          p.story,
          p.era,
          p.condition,
          ...p.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
        return true;
      });

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        list.sort((a, b) => b.year - a.year);
        break;
      default:
        list.sort(
          (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false)
        );
    }
    return list;
  }, [q, category, style, size, sort, products]);

  const hasFilters =
    q.trim() !== "" || category !== "all" || style !== "all" || size !== "all";

  const clearAll = () => {
    setQ("");
    setCategory("all");
    setStyle("all");
    setSize("all");
  };

  const bestSellers = products
    .filter((p) => p.visible !== false && p.featured)
    .slice(0, 4);

  const popularItems = bestSellingSlugs.length > 0
    ? (bestSellingSlugs
        .map((slug) => products.find((p) => p.slug === slug && p.visible !== false))
        .filter((p): p is Product => Boolean(p))
        .slice(0, 4))
    : products.filter((p) => p.visible !== false).slice(0, 4);

  const categoryIcons: Record<string, ReactNode> = {
    all: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    tee: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
      </svg>
    ),
    "button-up": (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
      </svg>
    ),
    polo: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
      </svg>
    ),
    overshirt: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
      </svg>
    ),
  };

  return (
    <section
      id="shop"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16"
    >
      {/* heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl tracking-tight text-espresso sm:text-4xl">
            {storeHeading}
          </h2>
        </div>
        <p className="text-sm text-mocha">
          {result.length} {result.length === 1 ? "piece" : "pieces"} · each one
          one of one
        </p>
      </div>

      {/* category pills + search */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              aria-pressed={category === c.value}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-all ${
                category === c.value
                  ? "bg-clay text-white shadow-sm shadow-clay/20"
                  : "bg-surface text-mocha ring-1 ring-border hover:ring-clay/30 hover:text-clay"
              }`}
            >
              {categoryIcons[c.value] || categoryIcons.all}
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs lg:max-w-xs">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-taupe"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shirts, styles, eras..."
            aria-label="Search pieces"
            className="w-full rounded-full bg-surface py-2.5 pr-4 pl-11 text-sm text-espresso ring-1 ring-border placeholder:text-taupe focus:border-clay focus:ring-2 focus:ring-clay/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Best Seller section */}
      {bestSellers.length > 0 && (
        <div className="mt-10">
          <div className="flex items-end justify-between">
            <h3 className="font-display text-2xl tracking-tight text-espresso">
              {bestSellerHeading}
            </h3>
            <button
              type="button"
              className="text-sm text-clay transition-colors hover:text-clay-deep"
            >
              See all
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {bestSellers.map((product: Product, i) => (
              <div
                key={product.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Items section */}
      <div className="mt-10">
        <div className="flex items-end justify-between">
          <h3 className="font-display text-2xl tracking-tight text-espresso">
            {popularHeading}
          </h3>
          <button
            type="button"
            className="text-sm text-clay transition-colors hover:text-clay-deep"
          >
            See all
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {popularItems.map((product: Product, i) => (
            <div
              key={product.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* style pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STYLE_FILTERS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStyle(s.value)}
            aria-pressed={style === s.value}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              style === s.value
                ? "bg-clay text-white"
                : "bg-surface text-mocha ring-1 ring-border hover:ring-clay/30 hover:text-clay"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* size + sort + clear */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CustomSelect
          value={size}
          onChange={setSize}
          aria-label="Filter by size"
          className="h-9 rounded-full text-[13px]"
          options={[
            { value: "all", label: "All sizes" },
            ...SIZES.map((s) => ({ value: s, label: `Size ${s}` })),
          ]}
        />

        <CustomSelect
          value={sort}
          onChange={setSort}
          aria-label="Sort pieces"
          className="h-9 rounded-full text-[13px]"
          options={SORT_OPTIONS}
        />

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[13px] text-clay transition-colors hover:text-clay-deep"
          >
            Clear all
          </button>
        )}
      </div>

      {/* all products grid */}
      {result.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
          {result.map((product: Product, i) => (
            <div
              key={product.id}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-sand-deep bg-cream/50 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-2xl">
            🔍
          </div>
          <p className="font-display text-2xl text-espresso">
            {emptyHeading}
          </p>
          <p className="max-w-sm text-sm text-mocha">
            {emptyBody}
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
