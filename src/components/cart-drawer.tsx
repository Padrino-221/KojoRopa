"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/components/cart-provider";
import { ShirtArt } from "@/components/shirt-art";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/products";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const {
    items,
    subtotal,
    shipping,
    isOpen,
    closeCart,
    setQty,
    removeItem,
  } = useCart();
  const panelRef = useRef<HTMLElement>(null);

  const freeShippingText = useSiteSetting("freeShippingText", "You've unlocked free shipping");
  const cartEmptyHeading = useSiteSetting("cartEmptyHeading", "Your bag is empty");
  const cartEmptyBody = useSiteSetting("cartEmptyBody", "Every piece is one of one — when it's gone, it's gone.");

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

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
        className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col bg-linen shadow-2xl focus:outline-none"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-xl tracking-tight text-espresso">
            Your bag{" "}
            <span className="text-sm font-sans text-mocha">
              ({items.reduce((n, l) => n + l.qty, 0)})
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

        {/* free shipping meter */}
        <div className="border-b border-border px-6 py-3">
          {remaining > 0 ? (
            <p className="text-[13px] text-mocha">
              You&rsquo;re{" "}
              <span className="font-semibold text-espresso">{formatPrice(remaining)}</span>{" "}
              away from free shipping
            </p>
          ) : (
            <p className="text-[13px] font-medium text-olive">
              {freeShippingText}
            </p>
          )}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-clay transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* lines */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream text-2xl">
              🧺
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
                <li key={`${line.productId}-${line.size}`} className="flex gap-4 rounded-2xl bg-surface p-3 ring-1 ring-border/50">
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
                      {/* qty stepper */}
                      <div className="flex items-center rounded-full bg-cream">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setQty(line.productId, line.size, line.qty - 1)}
                          aria-label="Decrease quantity"
                          className="h-7 w-7"
                        >
                          −
                        </Button>
                        <span className="w-6 text-center text-sm tabular-nums">{line.qty}</span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setQty(line.productId, line.size, line.qty + 1)}
                          aria-label="Increase quantity"
                          className="h-7 w-7"
                        >
                          +
                        </Button>
                      </div>
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
            <div className="mt-1.5 flex items-center justify-between text-sm text-mocha">
              <span>Shipping</span>
              <span className="tabular-nums">
                {shipping === 0 ? (
                  <span className="font-medium text-olive">Free</span>
                ) : (
                  formatPrice(shipping)
                )}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="font-medium text-espresso">Total</span>
              <span className="font-display text-xl tabular-nums text-espresso">
                {formatPrice(subtotal + shipping)}
              </span>
            </div>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="mt-4 flex w-full items-center justify-center rounded-full bg-clay py-3.5 text-sm font-medium tracking-wide text-white transition-colors hover:bg-clay-deep"
            >
              Checkout · {formatPrice(subtotal + shipping)}
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
