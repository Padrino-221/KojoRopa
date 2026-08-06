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

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Shopping bag">
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
        className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col border-l border-border bg-linen focus:outline-none"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="flex items-center gap-2.5 font-display text-xl tracking-tight text-espresso">
            Your bag
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium tabular-nums text-mocha ring-1 ring-border">
              {items.reduce((n, l) => n + l.qty, 0)}
            </span>
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={closeCart}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </Button>
        </div>

        {/* lines */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface ring-1 ring-border">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-taupe"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 7h12l1 13H5L6 7Z" />
                <path d="M9 7V6a3 3 0 0 1 6 0v1" />
              </svg>
            </div>
            <p className="font-display text-xl text-espresso">{cartEmptyHeading}</p>
            <p className="text-sm text-mocha">
              {cartEmptyBody}
            </p>
            <Link
              href="/#shop"
              onClick={closeCart}
              className="mt-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="thin-scroll flex-1 overflow-y-auto px-6 py-4">
            <ul className="space-y-4">
              {items.map((line) => (
                <li key={`${line.productId}-${line.size}`} className="flex gap-4 rounded-2xl bg-surface p-3 ring-1 ring-border/40 transition-colors hover:ring-clay/20">
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={closeCart}
                    className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-cream"
                  >
                    {line.image ? (
                      <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShirtArt art={line.art} className="h-full w-full" />
                    )}
                  </Link>

                  <div className="flex flex-1 flex-col justify-between py-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/product/${line.slug}`}
                          onClick={closeCart}
                          className="text-sm font-medium text-espresso transition-colors hover:text-clay"
                        >
                          {line.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-mocha">Size {line.size}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(line.productId, line.size)}
                        aria-label={`Remove ${line.name}`}
                        className="text-taupe transition-colors hover:text-sale"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-taupe">Qty: {line.qty}</p>
                      <p className="text-sm font-semibold tabular-nums text-espresso">
                        {formatPrice(line.price * line.qty)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-6 py-5">
            <div className="flex items-center justify-between text-sm text-mocha">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium text-espresso">Total</span>
              <span className="font-display text-xl tabular-nums text-espresso">
                {formatPrice(subtotal)}
              </span>
            </div>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="group mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-clay py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-clay-deep"
            >
              Checkout · {formatPrice(subtotal)}
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Button
              variant="ghost"
              onClick={closeCart}
              className="mt-2 w-full py-2"
            >
              or keep browsing
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
