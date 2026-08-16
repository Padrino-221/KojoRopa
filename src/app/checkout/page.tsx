"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { useCart } from "@/components/cart-provider";
import { ShirtArt } from "@/components/shirt-art";
import { formatPrice } from "@/lib/format";
import { createOrderAction } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckoutSteps } from "@/components/checkout-steps";

/* ——— Section card ——— */

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-5 sm:p-6">
      <h2 className="font-display text-[15px] font-semibold tracking-tight text-espresso">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ——— Selectable radio card (prototype radio-group) ——— */

function RadioOption({
  checked = false,
  disabled = false,
  icon,
  label,
}: {
  checked?: boolean;
  disabled?: boolean;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={checked}
      className={[
        "flex items-center gap-2.5 rounded-xl border px-4 py-3.5 text-[13px] font-medium transition-colors",
        checked
          ? "border-clay bg-teal-light"
          : "border-sand bg-white hover:border-sand-deep",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      <span
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? "border-clay" : "border-sand-deep"
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-clay" />}
      </span>
      <i
        className={`ph-duotone ph-${icon} h-4 w-4 shrink-0 ${
          checked ? "text-clay" : "text-mocha"
        }`}
      />
      <span className="text-left">{label}</span>
      {disabled && (
        <span className="ml-auto rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-taupe">
          Soon
        </span>
      )}
    </button>
  );
}

export default function CheckoutPage() {
  const { items, subtotal, deliveryFee, clearCart, isHydrated } = useCart();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    phone: "",
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const total = subtotal + deliveryFee;

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
        // Ghana has no postal-code requirement — orders are saved without one.
        postal: "",
        // The shop ships within Ghana only.
        country: "Ghana",
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
      <div className="mx-auto max-w-[1120px] animate-pulse px-4 py-20 sm:px-6 lg:px-10">
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
          icon={<i className="ph-duotone ph-shopping-bag h-7 w-7 text-taupe" />}
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
    <div className="mx-auto max-w-[1120px] px-4 pb-16 sm:px-6 lg:px-10">
      <h1 className="sr-only">Checkout</h1>
      <CheckoutSteps step="checkout" />

      <form
        onSubmit={handleSubmit}
        className="grid items-start gap-5 lg:grid-cols-[1fr_420px] lg:gap-8"
      >
        {/* form column */}
        <div className="space-y-5">
          {/* Contact */}
          <SectionCard title="Contact">
            <div>
              <Label htmlFor="email" required>
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                placeholder="you@example.com"
              />
            </div>
          </SectionCard>

          {/* Delivery */}
          <SectionCard title="Delivery method">
            <div className="grid max-w-sm gap-2.5">
              <RadioOption checked icon="truck" label="Delivery" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firstName" required>
                  First name
                </Label>
                <Input
                  id="firstName"
                  required
                  value={form.firstName}
                  onChange={set("firstName")}
                  placeholder="Kofi"
                />
              </div>
              <div>
                <Label htmlFor="lastName" required>
                  Last name
                </Label>
                <Input
                  id="lastName"
                  required
                  value={form.lastName}
                  onChange={set("lastName")}
                  placeholder="Mensah"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="address" required>
                  Street address
                </Label>
                <Input
                  id="address"
                  required
                  value={form.address}
                  onChange={set("address")}
                  placeholder="Street and number"
                />
              </div>
              <div>
                <Label htmlFor="city" required>
                  City
                </Label>
                <Input
                  id="city"
                  required
                  value={form.city}
                  onChange={set("city")}
                  placeholder="Accra"
                />
              </div>
              <div>
                <Label htmlFor="country" required>
                  Country
                </Label>
                <Input id="country" value="Ghana" disabled readOnly />
              </div>
            </div>
          </SectionCard>

          {/* Payment */}
          <SectionCard title="Payment">
            <div className="grid max-w-sm gap-2.5">
              <RadioOption checked icon="credit-card" label="Mobile Money" />
            </div>
            <div className="mt-4">
              <Label htmlFor="phone" required>
                MoMo phone number
              </Label>
              <Input
                id="phone"
                type="tel"
                required
                value={form.phone}
                onChange={set("phone")}
                placeholder="e.g. 0244 000 001"
              />
              <p className="mt-1.5 text-xs text-taupe">
                You&apos;ll receive a USSD prompt on your phone to confirm
                payment.
              </p>
            </div>
          </SectionCard>
        </div>

        {/* order summary */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-2xl bg-surface p-5 sm:p-6">
            <h2 className="font-display text-[15px] font-semibold tracking-tight text-espresso">
              Order summary
            </h2>

            <div className="mt-4 space-y-3 border-b border-sand pb-4">
              {items.map((line) => (
                <div
                  key={`${line.productId}-${line.size}`}
                  className="flex gap-3.5 py-1.5"
                >
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-sand bg-cream">
                    {line.image ? (
                      <img
                        src={line.image}
                        alt={line.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShirtArt art={line.art} className="h-full w-full" />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                    <p className="truncate text-[13px] font-semibold text-espresso">
                      {line.name}
                    </p>
                    <p className="text-xs text-taupe">
                      Size {line.size}
                      {line.qty > 1 ? ` · qty ${line.qty}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-espresso">
                      {formatPrice(line.price * line.qty)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <dl className="mt-4 space-y-2.5 text-[13px]">
              <div className="flex items-center justify-between">
                <dt className="text-mocha">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-espresso">
                  {formatPrice(subtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-mocha">Delivery</dt>
                <dd className="tabular-nums">
                  {deliveryFee > 0 ? (
                    <span className="font-semibold text-espresso">
                      {formatPrice(deliveryFee)}
                    </span>
                  ) : (
                    <span className="rounded-full bg-teal-light px-2 py-0.5 text-xs font-semibold text-clay">
                      Free
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-sand pt-3">
                <dt className="text-sm font-bold text-espresso">Total</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-espresso">
                  {formatPrice(total)}
                </dd>
              </div>
            </dl>

            <Button
              type="submit"
              disabled={placing}
              loading={placing}
              className="mt-6 w-full py-4 font-display text-sm font-semibold tracking-wide"
            >
              {placing
                ? "Placing order…"
                : `Place claim · ${formatPrice(total)}`}
            </Button>

            {error && (
              <p role="alert" className="mt-3 text-center text-xs text-sale">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 border-t border-sand pt-5">
              <span className="flex items-center gap-2.5 text-xs text-taupe">
                <i className="ph-duotone ph-shield-check h-4 w-4 shrink-0 text-clay" />
                Secure checkout — your data is protected
              </span>
              <span className="flex items-center gap-2.5 text-xs text-taupe">
                <i className="ph-duotone ph-check h-4 w-4 shrink-0 text-clay" />
                Every piece is verified authentic by Kojosropa
              </span>
              <span className="flex items-center gap-2.5 text-xs text-taupe">
                <i className="ph-duotone ph-arrow-left h-4 w-4 shrink-0 text-clay" />
                Free returns within 14 days
              </span>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
