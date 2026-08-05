"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart();
  const maxQty = parseInt(useSiteSetting("maxQty", "99"), 10) || 99;
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
          <Badge
            key={s}
            variant={size === s ? "primary" : "default"}
            size="md"
            className="min-w-12 cursor-pointer select-none"
            onClick={() => setSize(s)}
            role="button"
            aria-pressed={size === s}
          >
            {s}
          </Badge>
        ))}
      </div>
      {product.fitNote && (
        <p className="mt-2.5 text-[13px] text-mocha italic">→ {product.fitNote}</p>
      )}

      {/* qty + add */}
      <div className="mt-5 flex items-center gap-3">
        <div className="flex items-center shrink-0 rounded-full bg-cream">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="text-lg text-mocha hover:text-clay"
          >
            −
          </Button>
          <span className="w-8 text-center text-sm font-semibold tabular-nums">
            {qty}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            aria-label="Increase quantity"
            className="text-lg text-mocha hover:text-clay"
          >
            +
          </Button>
        </div>

        <Button
          onClick={handleAdd}
          disabled={!size}
          className={`relative flex h-12 flex-1 overflow-hidden px-4 sm:px-6 text-xs sm:text-sm tracking-wide ${
            justAdded ? "bg-olive hover:bg-olive" : ""
          }`}
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
        </Button>
      </div>

      <p className="mt-4 text-[13px] text-mocha">
        One of one — when it sells, this piece is retired for good.
      </p>
    </div>
  );
}
