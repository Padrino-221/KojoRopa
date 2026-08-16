"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { CONDITIONS, type Product } from "@/lib/products";
import {
  parseCategories,
  parseSizes,
  DEFAULT_CATEGORIES_RAW,
  DEFAULT_SIZES_RAW,
} from "@/lib/catalog";
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
  const [color, setColor] = useState("all");
  const [condition, setCondition] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The topbar search navigates to `/?q=...`; keep this input in sync with
  // the URL so re-renders (and in-page navigation) apply the new query.
  // Render-phase adjustment — the server-supplied query is the source of truth.
  if (initial.q !== q) setQ(initial.q);

  const emptyHeading = useSiteSetting("emptyHeading", "Nothing on this hanger");
  const emptyBody = useSiteSetting("emptyBody", "No pieces match those filters right now. Loosen a filter or two — the rack turns over every week.");
  const categoriesRaw = useSiteSetting("categories", DEFAULT_CATEGORIES_RAW);
  const sizesRaw = useSiteSetting("sizes", DEFAULT_SIZES_RAW);
  const categoryPills = useMemo(
    () => [{ value: "all", label: "All Pieces" }, ...parseCategories(categoriesRaw)],
    [categoriesRaw]
  );
  const sizeOptions = useMemo(() => parseSizes(sizesRaw), [sizesRaw]);

  /** Visible, unsold pieces — the pool every filter works on. */
  const visible = useMemo(
    () => products.filter((p) => p.visible !== false),
    [products]
  );

  const bounds = useMemo(() => {
    const prices = visible.map((p) => p.price);
    return {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 100,
    };
  }, [visible]);

  const [priceMin, setPriceMin] = useState(bounds.min);
  const [priceMax, setPriceMax] = useState(bounds.max);

  // Keep the chosen range inside the bounds if products change.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPriceMin((v) => Math.max(v, bounds.min));
    setPriceMax((v) => Math.min(v, bounds.max));
  }, [bounds.min, bounds.max]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const colorOptions = useMemo(() => {
    const seen: string[] = [];
    for (const p of visible) {
      if (p.art?.base && !seen.includes(p.art.base)) seen.push(p.art.base);
    }
    return seen;
  }, [visible]);

  const conditionOptions = useMemo(
    () => CONDITIONS.filter((c) => visible.some((p) => p.condition === c)),
    [visible]
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of visible) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [visible]);

  const avgPrice = useMemo(
    () =>
      visible.length
        ? Math.round(visible.reduce((sum, p) => sum + p.price, 0) / visible.length)
        : 0,
    [visible]
  );

  const result = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = visible
      .filter((p) => {
        if (category !== "all" && p.category !== category) return false;
        if (size !== "all" && !p.sizes.includes(size)) return false;
        if (color !== "all" && p.art?.base !== color) return false;
        if (condition !== "all" && p.condition !== condition) return false;
        if (p.price < priceMin || p.price > priceMax) return false;
        if (query) {
          const haystack = [p.name, p.tagline, p.story, p.condition]
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
      default:
        list.sort(
          (a, b) => Number(b.featured ?? false) - Number(a.featured ?? false)
        );
    }
    return list;
  }, [q, category, size, sort, color, condition, priceMin, priceMax, visible]);

  const hasFilters =
    q.trim() !== "" ||
    category !== "all" ||
    size !== "all" ||
    color !== "all" ||
    condition !== "all" ||
    priceMin > bounds.min ||
    priceMax < bounds.max;

  const clearAll = () => {
    setQ("");
    setCategory("all");
    setSize("all");
    setColor("all");
    setCondition("all");
    setPriceMin(bounds.min);
    setPriceMax(bounds.max);
  };

  // While the filter drawer is open on mobile, lock body scroll and hide the
  // floating bottom nav so it can't overlap the panel.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    document.body.classList.toggle("filter-drawer-open", drawerOpen);
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("filter-drawer-open");
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const span = bounds.max - bounds.min || 1;
  const pctMin = ((priceMin - bounds.min) / span) * 100;
  const pctMax = ((priceMax - bounds.min) / span) * 100;

  // The first card wears the brand-red tone when browsing in featured order —
  // the prototype's clay highlight card.
  const highlightSlug = result[0]?.featured ? result[0].slug : undefined;

  return (
    <section
      id="shop"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-4 sm:px-6 lg:px-8 lg:py-6"
    >
      <div className="flex items-start gap-5 lg:gap-6">
        {/* mobile drawer overlay */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-espresso/40 backdrop-blur-[2px] lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        )}

        {/* ——— Filters sidebar ——— */}
        <aside
          className={[
            "flex max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[280px] max-lg:max-w-[85vw]",
            "max-lg:flex-col max-lg:gap-3 max-lg:overflow-y-auto max-lg:bg-cream max-lg:p-4 max-lg:shadow-2xl",
            "max-lg:transition-transform max-lg:duration-300",
            drawerOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
            "lg:sticky lg:top-24 lg:w-[230px] lg:shrink-0 lg:flex-col lg:gap-3",
          ].join(" ")}
          aria-label="Filter pieces"
        >
          {/* close (mobile drawer only) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close filters"
            className="mb-1 flex h-8 w-8 items-center justify-center self-end rounded-full text-espresso transition-colors hover:bg-cream lg:hidden"
          >
            <i className="ph-duotone ph-x h-4 w-4" />
          </button>

          {/* ——— Count + size + sort ——— */}
          <div className="rounded-2xl bg-surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-cream px-3 py-1.5 text-xs font-medium tabular-nums text-espresso ring-1 ring-border">
                {result.length} {result.length === 1 ? "piece" : "pieces"}
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-semibold text-clay transition-colors hover:text-clay-deep"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CustomSelect
                value={size}
                onChange={setSize}
                aria-label="Filter by size"
                className="h-10 min-w-[110px] flex-1 rounded-full text-[13px]"
                options={[
                  { value: "all", label: "All sizes" },
                  ...sizeOptions.map((s) => ({ value: s, label: `Size ${s}` })),
                ]}
              />
              <CustomSelect
                value={sort}
                onChange={setSort}
                aria-label="Sort pieces"
                className="h-10 min-w-[110px] flex-1 rounded-full text-[13px]"
                options={SORT_OPTIONS}
              />
            </div>
          </div>

          {/* ——— Price Range ——— */}
          <div className="rounded-2xl bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-xs font-semibold text-espresso">
                Price Range
              </h3>
              <button
                type="button"
                onClick={() => {
                  setPriceMin(bounds.min);
                  setPriceMax(bounds.max);
                }}
                className="text-[11px] font-semibold text-clay transition-colors hover:text-clay-deep"
              >
                Reset
              </button>
            </div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-md bg-espresso px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                GH₵ {priceMin}
              </span>
              <span className="rounded-md bg-espresso px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                GH₵ {priceMax}
              </span>
            </div>
            <div className="dual-range my-3">
              <div
                className="dual-range-fill"
                style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
              />
              <input
                type="range"
                min={bounds.min}
                max={bounds.max}
                step={5}
                value={priceMin}
                aria-label="Minimum price"
                onChange={(e) =>
                  setPriceMin(Math.min(Number(e.target.value), priceMax))
                }
              />
              <input
                type="range"
                min={bounds.min}
                max={bounds.max}
                step={5}
                value={priceMax}
                aria-label="Maximum price"
                onChange={(e) =>
                  setPriceMax(Math.max(Number(e.target.value), priceMin))
                }
              />
            </div>
            <p className="text-center text-[10px] text-taupe">
              Average price is GH₵ {avgPrice}
            </p>
          </div>

          {/* ——— Color ——— */}
          {colorOptions.length > 0 && (
            <div className="rounded-2xl bg-surface p-4">
              <h3 className="mb-3 font-display text-xs font-semibold text-espresso">
                Color
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColor("all")}
                  aria-pressed={color === "all"}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                    color === "all"
                      ? "bg-clay text-white"
                      : "bg-cream text-mocha ring-1 ring-border hover:text-clay hover:ring-clay/50"
                  }`}
                >
                  All
                </button>
                {colorOptions.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    aria-label={`Filter by color ${hex}`}
                    aria-pressed={color === hex}
                    title={hex}
                    className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                      color === hex
                        ? "ring-2 ring-clay ring-offset-2"
                        : "ring-1 ring-sand-deep"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ——— Category ——— */}
          <div className="rounded-2xl bg-surface p-4">
            <h3 className="mb-2 font-display text-xs font-semibold text-espresso">
              Category
            </h3>
            <ul className="divide-y divide-cream">
              {categoryPills.map((c) => {
                const count =
                  c.value === "all" ? visible.length : counts.get(c.value) ?? 0;
                return (
                  <li key={c.value}>
                    <button
                      type="button"
                      onClick={() => setCategory(c.value)}
                      aria-pressed={category === c.value}
                      className={`flex w-full items-center justify-between py-2 text-left text-xs transition-colors ${
                        category === c.value
                          ? "font-semibold text-clay"
                          : "text-mocha hover:text-espresso"
                      }`}
                    >
                      <span>{c.label}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] tabular-nums ${
                          category === c.value
                            ? "bg-teal-light text-clay"
                            : "bg-cream text-taupe"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ——— Condition ——— */}
          {conditionOptions.length > 0 && (
            <div className="rounded-2xl bg-surface p-4">
              <h3 className="mb-3 font-display text-xs font-semibold text-espresso">
                Condition
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCondition("all")}
                  aria-pressed={condition === "all"}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    condition === "all"
                      ? "border-clay bg-clay text-white"
                      : "border-sand bg-white text-mocha hover:border-clay/50 hover:text-clay"
                  }`}
                >
                  All
                </button>
                {conditionOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    aria-pressed={condition === c}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                      condition === c
                        ? "border-clay bg-clay text-white"
                        : "border-sand bg-white text-mocha hover:border-clay/50 hover:text-clay"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ——— Main ——— */}
        <div className="min-w-0 flex-1">
          {/* filter toggle — mobile only */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-sand bg-white py-3 text-[13px] font-semibold text-espresso transition-colors hover:border-clay/40 hover:text-clay lg:hidden"
          >
            <i className="ph-duotone ph-funnel h-4 w-4" />
            Filters
          </button>

          {/* grid — no top offset so cards line up with the sidebar's first card */}
          {result.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 lg:grid-cols-3">
              {result.map((product: Product, i) => (
                <Reveal key={product.id} delay={Math.min(i, 7) * 60}>
                  <ProductCard
                    product={product}
                    tone={product.slug === highlightSlug ? "clay" : "default"}
                  />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-10 flex animate-scale-in flex-col items-center gap-4 rounded-[1.5rem] border border-dashed border-sand-deep bg-cream/40 px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface ring-1 ring-border">
                <i className="ph-duotone ph-magnifying-glass h-7 w-7 text-taupe" />
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
        </div>
      </div>
    </section>
  );
}
