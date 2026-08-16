"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart-provider";
import { ShirtArt } from "@/components/shirt-art";
import { formatPrice } from "@/lib/format";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const {
    items,
    subtotal,
    deliveryFee,
    isOpen,
    closeCart,
    removeItem,
  } = useCart();
  const panelRef = useRef<HTMLElement>(null);

  const cartEmptyHeading = useSiteSetting("cartEmptyHeading", "Your bag is empty");
  const cartEmptyBody = useSiteSetting("cartEmptyBody", "Every piece is one of one — when it's gone, it's gone.");

  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const total = subtotal + deliveryFee;

  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label="Shopping bag">
      {/* overlay */}
      <button
        type="button"
        aria-label="Close bag"
        onClick={closeCart}
        className="absolute inset-0 animate-fade-in cursor-default bg-espresso/40 backdrop-blur-sm"
      />

      {/* panel */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="absolute top-0 right-0 flex h-full w-full max-w-md animate-slide-in flex-col border-l border-sand bg-cream focus:outline-none"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-sand px-6 py-4">
          <h2 className="flex items-center gap-2.5 font-display text-lg tracking-tight text-espresso">
            Your bag
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium tabular-nums text-mocha ring-1 ring-border">
              {items.reduce((n, l) => n + l.qty, 0)}
            </span>
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-espresso transition-colors hover:bg-cream"
          >
            <i className="ph-duotone ph-x h-4 w-4" />
          </button>
        </div>

        {/* lines */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface ring-1 ring-border">
              <i className="ph-duotone ph-shopping-bag h-7 w-7 text-taupe" />
            </div>
            <p className="font-display text-xl text-espresso">{cartEmptyHeading}</p>
            <p className="text-sm text-mocha">{cartEmptyBody}</p>
            <Link
              href="/#shop"
              onClick={closeCart}
              className="mt-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">
            <ul className="space-y-3.5">
              {items.map((line) => (
                <li
                  key={`${line.productId}-${line.size}`}
                  className="flex gap-4 rounded-2xl bg-surface p-3.5 transition-transform hover:-translate-y-0.5"
                >
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={closeCart}
                    className="h-24 w-[76px] shrink-0 overflow-hidden rounded-xl bg-cream"
                  >
                    {line.image ? (
                      <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShirtArt art={line.art} className="h-full w-full" />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="min-w-0">
                      {line.category && (
                        <p className="text-[9px] font-semibold tracking-[0.06em] text-clay uppercase">
                          {line.category}
                        </p>
                      )}
                      <Link
                        href={`/product/${line.slug}`}
                        onClick={closeCart}
                        className="mt-0.5 block truncate font-display text-[13px] leading-snug font-semibold text-espresso transition-colors hover:text-clay"
                      >
                        {line.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-taupe">
                        Size {line.size}
                        {line.qty > 1 ? ` · qty ${line.qty}` : ""}
                      </p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <span className="font-display text-[15px] font-bold tabular-nums text-espresso">
                        {formatPrice(line.price * line.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(line.productId, line.size)}
                        aria-label={`Remove ${line.name}`}
                        className="rounded-md px-2 py-1 text-xs font-medium text-taupe transition-colors hover:bg-teal-light hover:text-clay"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* footer */}
        {items.length > 0 && (
          <div className="border-t border-sand px-6 py-5">
            <div className="flex items-center justify-between text-sm text-mocha">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-sm text-mocha">
              <span>Delivery</span>
              {deliveryFee > 0 ? (
                <span className="tabular-nums">{formatPrice(deliveryFee)}</span>
              ) : (
                <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs font-semibold text-clay">
                  Free
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-sand pt-3">
              <span className="font-medium text-espresso">Total</span>
              <span className="font-display text-xl font-bold tabular-nums text-espresso">
                {formatPrice(total)}
              </span>
            </div>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-clay py-3.5 font-display text-sm font-semibold tracking-wide text-white transition-colors hover:bg-clay-deep"
            >
              Checkout · {formatPrice(total)}
              <i className="ph-duotone ph-arrow-right h-4 w-4" />
            </Link>
            <Button
              variant="ghost"
              onClick={closeCart}
              className="mt-1 w-full py-2"
            >
              or keep browsing
            </Button>

            <div className="mt-3 flex flex-col gap-2.5 border-t border-sand pt-4">
              <span className="flex items-center gap-2 text-[11px] text-taupe">
                <i className="ph-duotone ph-shield-check h-3.5 w-3.5 shrink-0 text-clay" />
                Secure checkout
              </span>
              <span className="flex items-center gap-2 text-[11px] text-taupe">
                <i className="ph-duotone ph-heart h-3.5 w-3.5 shrink-0 text-clay" />
                Each piece is one of a kind
              </span>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
