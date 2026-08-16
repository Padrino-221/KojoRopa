import Link from "next/link";
import { formatPrice, formatOrderDate } from "@/lib/format";
import type { OrderItemModel } from "@/generated/prisma/models";
import { getAllSettings } from "@/lib/actions/settings";
import { CheckoutSteps } from "@/components/checkout-steps";

export interface ReceiptOrder {
  id: string;
  placedAt: Date;
  email: string;
  name: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  street: string;
  city: string;
  postal: string;
  country: string;
  items: OrderItemModel[];
}

export async function OrderReceipt({ order }: { order: ReceiptOrder }) {
  const s = await getAllSettings();
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6 lg:pb-20">
      <CheckoutSteps step="confirmation" />

      <div className="animate-pop text-center">
        <div className="mx-auto flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-teal-light sm:h-20 sm:w-20">
          <i className="ph-duotone ph-check h-8 w-8 text-clay sm:h-10 sm:w-10" />
        </div>
        <h1 className="mt-5 font-display text-3xl tracking-tight text-espresso sm:mt-6 sm:text-4xl lg:text-5xl">
          Order confirmed
        </h1>
        <p className="mt-3 text-sm text-mocha sm:text-base">
          Thanks, {order.name.split(" ")[0] || "friend"} —{" "}
          {s.receiptGreetingSuffix || "your pieces are being wrapped as we speak."}
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-xs sm:gap-3 sm:px-5 sm:py-2.5 sm:text-sm">
          <span className="tracking-wide uppercase text-taupe">
            Order
          </span>
          <span className="font-semibold tabular-nums text-espresso">
            {order.id}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-taupe sm:text-xs">
          Placed {formatOrderDate(order.placedAt)} · receipt sent to{" "}
          {order.email}
        </p>
      </div>

      {/* summary */}
      <div className="mt-8 rounded-2xl bg-surface p-4 sm:mt-10 sm:p-6 lg:p-8">
        <h2 className="font-display text-lg text-espresso sm:text-xl">Your pieces</h2>
        <ul className="mt-4 divide-y divide-border sm:mt-5">
          {order.items.map((line) => (
            <li
              key={`${line.slug}-${line.size}`}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-espresso">{line.name}</p>
                <p className="mt-0.5 text-xs text-mocha">
                  Size {line.size} · qty {line.qty}
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-espresso">
                {formatPrice(line.price * line.qty)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-mocha">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between text-mocha">
              <dt>Delivery fee</dt>
              <dd className="tabular-nums">{formatPrice(order.deliveryFee)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-3 text-base font-semibold text-espresso">
            <dt>Total paid</dt>
            <dd className="font-display text-xl tabular-nums sm:text-2xl">
              {formatPrice(order.total)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl bg-cream p-3 text-sm text-mocha sm:mt-5 sm:p-4">
          <p className="font-medium text-espresso">Delivery to</p>
          <p className="mt-1">
            {order.name}
            <br />
            {order.street}
            <br />
            {order.postal ? `${order.postal} ` : ""}{order.city}, {order.country}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
        <Link
          href="/#shop"
          className="w-full sm:w-auto rounded-full bg-clay px-6 py-3 text-sm font-medium text-white text-center transition-colors hover:bg-clay-deep sm:px-7 sm:py-3.5"
        >
          {s.receiptCta || "Keep browsing the rack"}
        </Link>
        <p className="text-xs text-taupe">
          {s.receiptFooter || "Thank you for shopping with Kojosropa."}
        </p>
      </div>
    </div>
  );
}
