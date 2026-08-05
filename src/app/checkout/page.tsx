"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { ShirtArt } from "@/components/shirt-art";
import { formatPrice } from "@/lib/format";
import {
  SHIPPING_COUNTRIES,
} from "@/lib/products";
import { useSiteSetting } from "@/components/site-settings-provider";
import { createOrderAction } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function CheckoutPage() {
  const { items, subtotal, shipping, clearCart, isHydrated } = useCart();
  const router = useRouter();
  const defaultCountry = useSiteSetting("defaultCountry", "Ghana");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    postal: "",
    country: defaultCountry,
    phone: "",
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const total = subtotal + shipping;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (placing || items.length === 0) return;
    setPlacing(true);
    setError(null);

    const res = await createOrderAction({
      email: form.email,
      name: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
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
    router.push(`/payment-pending?token=${res.token}`);
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
        <EmptyState
          icon="🛍️"
          title="Your bag is empty"
          description="Add a piece or two from the rack before checking out."
          action={
            <Link
              href="/#shop"
              className="mt-2 rounded-full bg-clay px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-clay-deep"
            >
              Back to the rack
            </Link>
          }
        />
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
                  <p className="text-sm tabular-nums text-espresso">
                    {formatPrice(line.price * line.qty)}
                  </p>
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
              <Label htmlFor="email" required>Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
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
                <Label htmlFor="firstName" required>First name</Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={set("firstName")}
                />
              </div>
              <div>
                <Label htmlFor="lastName" required>Last name</Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={set("lastName")}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address" required>Street address</Label>
                <Input
                  id="address"
                  required
                  value={form.address}
                  onChange={set("address")}
                  placeholder="Street and number"
                />
              </div>
              <div>
                <Label htmlFor="city" required>City</Label>
                <Input
                  id="city"
                  required
                  value={form.city}
                  onChange={set("city")}
                />
              </div>
              <div>
                <Label htmlFor="postal" required>Postal code</Label>
                <Input
                  id="postal"
                  required
                  value={form.postal}
                  onChange={set("postal")}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="country" required>Country</Label>
                <Select
                  id="country"
                  value={form.country}
                  onChange={set("country")}
                >
                  {SHIPPING_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
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
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="phone" required>Mobile Money number</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="e.g. 0244 000 001"
                />
                <p className="mt-1.5 text-xs text-taupe">
                  You&apos;ll receive a USSD prompt on your phone to confirm payment.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* summary */}
        <Card padding="lg" className="shadow-lg lg:sticky lg:top-24">
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
            {shipping > 0 && (
              <div className="flex justify-between text-mocha">
                <dt>Delivery charge</dt>
                <dd className="tabular-nums">{formatPrice(shipping)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-espresso">
              <dt>Total</dt>
              <dd className="font-display text-2xl tabular-nums">
                {formatPrice(total)}
              </dd>
            </div>
          </dl>

          <Button
            type="submit"
            disabled={placing}
            loading={placing}
            className="mt-6 w-full py-4 text-sm tracking-wide"
          >
            {placing ? "Placing order…" : `Place Order · ${formatPrice(total)}`}
          </Button>

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
        </Card>
      </form>
    </div>
  );
}
