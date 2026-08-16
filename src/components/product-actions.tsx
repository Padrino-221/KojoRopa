"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";

export function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState<string | null>(product.sizes[0] ?? null);
  const [justAdded, setJustAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1800);
    return () => clearTimeout(t);
  }, [justAdded]);

  const handleAdd = () => {
    if (!size) return;
    addItem(product, size);
    setJustAdded(true);
  };

  return (
    <div>
      <p className="font-display text-[13px] font-semibold text-espresso">
        This piece{" "}
        <span className="font-normal text-taupe">— choose your size</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {product.sizes.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            aria-pressed={size === s}
            className={`inline-flex min-w-12 items-center justify-center rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              size === s
                ? "border-clay bg-teal-light text-clay"
                : "border-sand bg-white text-mocha hover:border-clay/50 hover:text-clay"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-taupe">
        {product.condition} · all pieces measured honestly
      </p>

      {/* action row */}
      <div className="mt-4 flex items-stretch gap-3">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!size}
          className={`flex-1 rounded-xl px-6 py-4 font-display text-sm font-semibold tracking-wide text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            justAdded ? "bg-espresso" : "bg-clay hover:bg-clay-deep"
          }`}
        >
          {justAdded ? (
            <span className="flex animate-pop items-center justify-center gap-2">
              <i className="ph-duotone ph-check h-4 w-4 text-white" />
              Added to bag
            </span>
          ) : (
            <>Claim this piece — {formatPrice(product.price)}</>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSaved((v) => !v)}
          aria-label={saved ? "Remove from saved" : "Save piece"}
          aria-pressed={saved}
          className={`flex w-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
            saved
              ? "border-clay bg-teal-light"
              : "border-sand bg-white hover:border-clay hover:bg-teal-light"
          }`}
        >
          <i
            className={`ph-duotone ph-heart h-5 w-5 ${
              saved ? "text-clay" : "text-mocha"
            }`}
          />
        </button>
      </div>

      <p className="mt-4 text-[13px] text-mocha">
        One of one — when it sells, this piece is retired for good.
      </p>
    </div>
  );
}
