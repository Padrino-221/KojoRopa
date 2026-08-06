"use client";

import { useState } from "react";
import Link from "next/link";
import { ShirtArt } from "@/components/shirt-art";
import { useCart } from "@/components/cart-provider";
import { formatPrice, formatSavings } from "@/lib/format";
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleQuickAdd = () => {
    addItem(product, product.sizes[0]);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group">
      <div className="relative overflow-hidden rounded-2xl bg-surface ring-1 ring-border/40 transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:ring-clay/25">
        <Link
          href={`/product/${product.slug}`}
          className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay"
          aria-label={product.name}
        >
          <div className="aspect-square bg-gradient-to-br from-cream to-linen">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              />
            ) : (
              <ShirtArt
                art={product.art}
                className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              />
            )}
          </div>

          {/* badges */}
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {product.condition === "Deadstock" && (
              <span className="rounded-full bg-clay px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase text-white">
                Deadstock
              </span>
            )}
            {product.compareAt && (
              <span className="rounded-full bg-clay px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase text-white">
                {formatSavings(product.price, product.compareAt)}
              </span>
            )}
          </div>
        </Link>

        {/* mobile: simple + button always visible */}
        <div
          className="absolute right-3 bottom-3 md:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label={`Add ${product.name} to bag`}
            onClick={handleQuickAdd}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
              added
                ? "bg-olive text-white"
                : "bg-white/95 text-clay backdrop-blur hover:bg-clay hover:text-white"
            }`}
          >
            {added ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </button>
        </div>

        {/* desktop: size pills + add on hover */}
        <div
          className="absolute right-3 bottom-3 hidden translate-y-0 opacity-100 transition-all duration-300 md:translate-y-12 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 rounded-full bg-white/95 p-1 ring-1 ring-border/40 backdrop-blur">
            <div className="flex items-center gap-0.5 px-1">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-label={`Add ${product.name} in size ${size} to bag`}
                  onClick={() => addItem(product, size)}
                  className="rounded-full px-2 py-1 text-[11px] font-medium text-mocha transition-colors hover:bg-clay hover:text-white"
                >
                  {size}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label={`Add ${product.name} to bag`}
              onClick={() => addItem(product, product.sizes[0])}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-clay text-white transition-colors hover:bg-clay-deep"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 px-0.5">
        <Link
          href={`/product/${product.slug}`}
          className="block truncate text-[15px] font-medium text-espresso transition-colors group-hover:text-clay"
        >
          {product.name}
        </Link>
        <div className="mt-1 flex items-center gap-1.5">
          <p className="text-[15px] font-semibold tabular-nums text-espresso">
            {formatPrice(product.price)}
          </p>
          {product.compareAt && (
            <p className="text-xs text-taupe line-through tabular-nums">
              {formatPrice(product.compareAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
