"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";

export function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState<string | null>(product.sizes[0] ?? null);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1800);
    return () => clearTimeout(t);
  }, [justAdded]);

  const handleAdd = () => {
    if (!size) return;
    addItem(product, size, qty);
    setJustAdded(true);
  };

  return (
    <div className="mt-5">
      {/* sizes */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-espresso">Size</p>
        <p className="text-xs text-taupe">All pieces measured honestly</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {product.sizes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            aria-pressed={size === s}
            className={`min-w-12 rounded-full px-4 py-2.5 text-sm font-medium transition-all ${
              size === s
                ? "bg-clay text-white shadow-sm shadow-clay/20"
                : "bg-surface text-espresso ring-1 ring-border hover:ring-clay/40"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {product.fitNote && (
        <p className="mt-2.5 text-[13px] text-mocha italic">→ {product.fitNote}</p>
      )}

      {/* qty + add */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex items-center shrink-0 rounded-full bg-cream">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-mocha transition-colors hover:text-clay"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
            aria-label="Increase quantity"
            className="flex h-12 w-12 items-center justify-center rounded-full text-lg text-mocha transition-colors hover:text-clay"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!size}
          className={`relative flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full px-4 sm:px-6 text-xs sm:text-sm font-medium tracking-wide transition-all ${
            justAdded
              ? "bg-olive text-white"
              : "bg-clay text-white hover:bg-clay-deep"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {justAdded ? (
            <span className="flex animate-pop items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Added to bag
            </span>
          ) : (
            <>
              Add to Cart · {formatPrice(product.price * qty)}
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-[13px] text-mocha">
        One of one — when it sells, this piece is retired for good.
      </p>
    </div>
  );
}
