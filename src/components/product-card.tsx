"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { ShirtArt } from "@/components/shirt-art";
import { useCart } from "@/components/cart-provider";
import { formatPrice, formatSavings } from "@/lib/format";
import type { Product } from "@/lib/products";

type CardTone = "default" | "clay";

export function ProductCard({
  product,
  tone = "default",
}: {
  product: Product;
  tone?: CardTone;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleQuickAdd = () => {
    addItem(product, product.sizes[0]);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  // Rack badge — matches the one-of-one concept from the prototype.
  const badge =
    product.condition === "Deadstock"
      ? { text: "Deadstock", solid: true }
      : product.compareAt
        ? { text: formatSavings(product.price, product.compareAt), solid: false }
        : { text: "One of One", solid: true };

  // Buttons inside the card <Link> must not trigger navigation.
  const stop = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const clay = tone === "clay";

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
        clay
          ? "bg-clay hover:shadow-[0_18px_40px_-16px_rgba(200,16,46,0.55)]"
          : "bg-white shadow-sm hover:shadow-lg"
      }`}
    >
      {/* image */}
      <div
        className={`relative aspect-square overflow-hidden ${
          clay
            ? "bg-gradient-to-br from-clay-deep to-clay"
            : "bg-gradient-to-br from-cream to-linen"
        }`}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <ShirtArt
            art={product.art}
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        )}

        {/* badge */}
        <span
          className={`absolute top-2.5 left-2.5 rounded-md px-2 py-1 text-[9px] font-bold tracking-[0.06em] uppercase ${
            badge.solid
              ? clay
                ? "bg-white text-clay"
                : "bg-espresso text-white"
              : clay
                ? "bg-white/15 text-white"
                : "bg-white text-espresso ring-1 ring-sand"
          }`}
        >
          {badge.text}
        </span>

        {/* save */}
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            setSaved((v) => !v);
          }}
          aria-label={saved ? "Remove from saved" : "Save piece"}
          aria-pressed={saved}
          className={`absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-105 ${
            clay ? "bg-white/20 hover:bg-white/30" : "bg-white/90 shadow-sm hover:bg-white"
          }`}
        >
          <i
            className={`ph-duotone ph-heart h-3.5 w-3.5 ${
              saved ? "text-clay" : clay ? "text-white" : "text-taupe"
            }`}
          />
        </button>

        {/* quick add */}
        <div className="absolute right-2 bottom-2 z-[1]" onClick={stop}>
          <button
            type="button"
            aria-label={`Add ${product.name} to bag`}
            onClick={(e) => {
              stop(e);
              handleQuickAdd();
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
              added
                ? "bg-white text-clay"
                : clay
                  ? "bg-white/20 text-white backdrop-blur hover:bg-white hover:text-clay"
                  : "bg-white/95 text-clay shadow-sm backdrop-blur hover:bg-clay hover:text-white"
            }`}
          >
            {added ? (
              <i className="ph-duotone ph-check h-4 w-4" />
            ) : (
              <i className="ph-duotone ph-shopping-bag h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* body */}
      <div className={`flex flex-1 flex-col p-3 ${clay ? "text-white" : ""}`}>
        <p
          className={`text-[9px] font-semibold tracking-[0.06em] uppercase ${
            clay ? "text-white/70" : "text-clay"
          }`}
        >
          {product.category}
        </p>
        <h3
          className={`mt-1 line-clamp-2 font-display text-[13px] leading-snug font-semibold transition-colors ${
            clay ? "text-white" : "text-espresso group-hover:text-clay"
          }`}
        >
          {product.name}
        </h3>
        {product.sizes.length > 0 && (
          <p className={`mt-1 text-[11px] ${clay ? "text-white/60" : "text-taupe"}`}>
            Size {product.sizes.join(", ")}
          </p>
        )}
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          <span
            className={`font-display text-[15px] font-bold tabular-nums ${
              clay ? "text-white" : "text-espresso"
            }`}
          >
            {formatPrice(product.price)}
          </span>
          {product.compareAt && (
            <span
              className={`truncate text-[11px] line-through tabular-nums ${
                clay ? "text-white/50" : "text-taupe"
              }`}
            >
              {formatPrice(product.compareAt)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
