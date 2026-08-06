"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ProductCard } from "@/components/product-card";
import { CATEGORIES, SIZES } from "@/lib/products";
import type { Product } from "@/lib/products";
import { useSiteSetting } from "@/components/site-settings-provider";
import { CustomSelect } from "@/components/ui/custom-select";
import { Reveal } from "@/components/ui/reveal";

export interface StorefrontInitial {
  q: string;
  category: string;
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
}: {
  initial: StorefrontInitial;
  products: Product[];
}) {
  const [q, setQ] = useState(initial.q);
  const [category, setCategory] = useState(initial.category);
  const [size, setSize] = useState(initial.size);
  const [sort, setSort] = useState(initial.sort);

  const storeHeading = useSiteSetting("storeHeading", "Popular of the week");
  const emptyHeading = useSiteSetting("emptyHeading", "Nothing on this hanger");
  const emptyBody = useSiteSetting("emptyBody", "No pieces match those filters right now. Loosen a filter or two — the rack turns over every week.");

  const result = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = products
      .filter((p) => p.visible !== false)
      .filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (size !== "all" && !p.sizes.includes(size)) return false;
      if (query) {
        const haystack = [
          p.name,
          p.tagline,
          p.story,
          p.condition,
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
        // Already sorted by createdAt desc from the server
        break;
        break;
      default:
        list.sort(
          (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false)
        );
    }
    return list;
  }, [q, category, size, sort, products]);

  const hasFilters =
    q.trim() !== "" || category !== "all" || size !== "all";

  const clearAll = () => {
    setQ("");
    setCategory("all");
    setSize("all");
  };

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
          <p className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.22em] text-clay uppercase">
            <span aria-hidden className="h-px w-8 bg-clay/60" />
            The rack
          </p>
          <h2 className="mt-3 font-display text-4xl tracking-tight text-balance text-espresso sm:text-5xl">
            {storeHeading}
          </h2>
        </div>
        <p className="flex items-center gap-2 text-sm text-mocha">
          <span className="rounded-full bg-cream px-3 py-1 text-xs font-medium tabular-nums text-espresso ring-1 ring-border">
            {result.length}
          </span>
          {result.length === 1 ? "piece" : "pieces"} · each one one of one
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
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-all duration-200 active:scale-95 ${
                category === c.value
                  ? "bg-clay text-white"
                  : "bg-surface text-mocha ring-1 ring-border hover:bg-cream hover:ring-clay/40 hover:text-clay"
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
            <Reveal key={product.id} delay={Math.min(i, 7) * 60}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-12 flex animate-scale-in flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-sand-deep bg-cream/40 px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface ring-1 ring-border">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-taupe"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <p className="font-display text-2xl text-espresso">{emptyHeading}</p>
          <p className="max-w-sm text-sm text-mocha">{emptyBody}</p>
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
