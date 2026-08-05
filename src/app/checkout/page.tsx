"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { ShirtArt } from "@/components/shirt-art";
import { formatPrice } from "@/lib/format";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COUNTRIES,
} from "@/lib/products";
import { createOrderAction } from "@/lib/actions/orders";

const inputClass =
  "w-full rounded-xl bg-surface px-4 py-3 text-sm text-espresso ring-1 ring-border placeholder:text-taupe focus:border-clay focus:ring-2 focus:ring-clay/20 focus:outline-none";
const labelClass =
  "mb-1.5 block text-xs font-semibold tracking-wide uppercase text-mocha";

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function CheckoutPage() {
  const { items, subtotal, shipping, clearCart, isHydrated } = useCart();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postal: "",
    country: "Finland",
    card: "",
    expiry: "",
    cvc: "",
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const total = subtotal + shipping;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (placing || items.length === 0) return;
    setPlacing(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 1500));

    const res = await createOrderAction({
      email: form.email,
      name: `${form.firstName} ${form.lastName}`.trim(),
      items: items.map((l) => ({
        slug: l.slug,
        size: l.size,
        qty: l.qty,
      })),
      address: {
        street: form.address,
        city: form.city,
        postal: form.postal,
        country: form.country,
      },
    });

    setPlacing(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    clearCart();
    router.push(`/confirmation?token=${res.token}`);
  };

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-20 sm:px-6 lg:px-8">
        <div className="h-10 w-64 rounded-full bg-sand" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_0.6fr]">
          <div className="h-96 rounded-2xl bg-cream" />
          <div className="h-96 rounded-2xl bg-cream" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream text-3xl">
          🛍️
        </div>
        <h1 className="font-display text-3xl text-espresso">
          Your bag is empty
        </h1>
        <p className="text-sm text-mocha">
          Add a piece or two from the rack before checking out.
        </p>
        <Link
          href="/#shop"
          className="mt-2 rounded-full bg-clay px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
        >
          Back to the rack
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex items-center gap-3">
        <Link href="/#shop" className="text-mocha transition-colors hover:text-espresso">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="font-display text-3xl tracking-tight text-espresso sm:text-4xl">
          Checkout
        </h1>
      </div>
      <p className="mt-2 text-sm text-mocha">
        This is a demo store — no real payment is processed.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_0.55fr]"
      >
        {/* form column */}
        <div className="space-y-6">
          {/* cart items list */}
          <section>
            <h2 className="font-display text-xl text-espresso">Your Items</h2>
            <div className="mt-4 space-y-3">
              {items.map((line) => (
                <div
                  key={`${line.productId}-${line.size}`}
                  className="flex items-center gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border/50"
                >
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-cream">
                    {line.image ? (
                      <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                    ) : (
                      <ShirtArt art={line.art} className="h-full w-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-espresso">
                      {line.name}
                    </p>
                    <p className="text-xs text-mocha">
                      {line.size} · {formatPrice(line.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-mocha transition-colors hover:text-clay"
                      onClick={() => {
                        /* Would decrement quantity */
                      }}
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-espresso">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-clay text-white transition-colors hover:bg-clay-deep"
                      onClick={() => {
                        /* Would increment quantity */
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* contact */}
          <section>
            <h2 className="flex items-center gap-3 font-display text-xl text-espresso">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay text-xs font-semibold text-white">
                1
              </span>
              Contact
            </h2>
            <div className="mt-4">
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
          </section>

          {/* shipping */}
          <section>
            <h2 className="flex items-center gap-3 font-display text-xl text-espresso">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay text-xs font-semibold text-white">
                2
              </span>
              Shipping
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className={labelClass}>
                  First name
                </label>
                <input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={set("firstName")}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="lastName" className={labelClass}>
                  Last name
                </label>
                <input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={set("lastName")}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="address" className={labelClass}>
                  Street address
                </label>
                <input
                  id="address"
                  required
                  value={form.address}
                  onChange={set("address")}
                  placeholder="Street and number"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="city" className={labelClass}>
                  City
                </label>
                <input
                  id="city"
                  required
                  value={form.city}
                  onChange={set("city")}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="postal" className={labelClass}>
                  Postal code
                </label>
                <input
                  id="postal"
                  required
                  value={form.postal}
                  onChange={set("postal")}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="country" className={labelClass}>
                  Country
                </label>
                <select
                  id="country"
                  value={form.country}
                  onChange={set("country")}
                  className={inputClass}
                >
                  {SHIPPING_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* payment */}
          <section>
            <h2 className="flex items-center gap-3 font-display text-xl text-espresso">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay text-xs font-semibold text-white">
                3
              </span>
              Payment
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="card" className={labelClass}>
                  Card number
                </label>
                <input
                  id="card"
                  inputMode="numeric"
                  required
                  value={form.card}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      card: formatCardNumber(e.target.value),
                    }))
                  }
                  placeholder="4242 4242 4242 4242"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="expiry" className={labelClass}>
                  Expiry
                </label>
                <input
                  id="expiry"
                  inputMode="numeric"
                  required
                  value={form.expiry}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      expiry: formatExpiry(e.target.value),
                    }))
                  }
                  placeholder="MM/YY"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="cvc" className={labelClass}>
                  CVC
                </label>
                <input
                  id="cvc"
                  inputMode="numeric"
                  required
                  value={form.cvc}
                  onChange={set("cvc")}
                  placeholder="123"
                  maxLength={4}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-taupe">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Demo checkout — any format-valid card will do. Nothing is charged.
            </p>
          </section>
        </div>

        {/* summary */}
        <aside className="rounded-3xl bg-surface p-6 shadow-lg ring-1 ring-border/50 lg:sticky lg:top-24">
          <h2 className="font-display text-xl text-espresso">Order summary</h2>
          <ul className="mt-5 max-h-72 space-y-4 overflow-y-auto thin-scroll pr-1">
            {items.map((line) => (
              <li key={`${line.productId}-${line.size}`} className="flex items-center gap-3">
                <div className="h-14 w-11 shrink-0 overflow-hidden rounded-xl bg-cream">
                  {line.image ? (
                    <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                  ) : (
                    <ShirtArt art={line.art} className="h-full w-full" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-espresso">
                    {line.name}
                  </p>
                  <p className="text-xs text-mocha">
                    {line.size} · qty {line.qty}
                  </p>
                </div>
                <p className="text-sm tabular-nums text-espresso">
                  {formatPrice(line.price * line.qty)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-mocha">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-mocha">
              <dt>Delivery charge</dt>
              <dd className="tabular-nums">
                {shipping === 0 ? (
                  <span className="font-medium text-olive">Free</span>
                ) : (
                  formatPrice(shipping)
                )}
              </dd>
            </div>
            {shipping > 0 && (
              <p className="text-xs text-taupe">
                Add {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} more for
                free shipping
              </p>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-espresso">
              <dt>Total</dt>
              <dd className="font-display text-2xl tabular-nums">
                {formatPrice(total)}
              </dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={placing}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-clay py-4 text-sm font-medium tracking-wide text-white transition-colors hover:bg-clay-deep disabled:cursor-wait disabled:opacity-70"
          >
            {placing ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.2-8.56" />
                </svg>
                Processing payment…
              </>
            ) : (
              `Pay Now · ${formatPrice(total)}`
            )}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-center text-xs text-sale">
              {error}
            </p>
          )}

          <ul className="mt-5 space-y-2 text-xs text-mocha">
            <li className="flex items-center gap-2">
              <span className="text-olive">✓</span> Free returns within 14 days
            </li>
            <li className="flex items-center gap-2">
              <span className="text-olive">✓</span> Each piece is one of one
            </li>
            <li className="flex items-center gap-2">
              <span className="text-olive">✓</span> Ships from Accra in 1–3 days
            </li>
          </ul>
        </aside>
      </form>
    </div>
  );
}
