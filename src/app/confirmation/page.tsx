import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderReceipt } from "@/components/order-receipt";
import { getOrderByToken } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage(
  props: PageProps<"/confirmation">
) {
  const qp = await props.searchParams;
  const token =
    typeof qp.token === "string" && qp.token.trim() ? qp.token.trim() : null;
  const order = token ? await getOrderByToken(token) : null;

  if (!order) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center sm:py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream sm:h-16 sm:w-16">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 text-taupe"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
          </svg>
        </div>
        <h1 className="font-display text-2xl text-espresso sm:text-3xl">
          No order to confirm here
        </h1>
        <p className="max-w-sm text-sm text-mocha">
          This page shows the receipt for an order. Place one from the rack and
          you&rsquo;ll be brought here with your order number.
        </p>
        <Link
          href="/#shop"
          className="mt-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-clay-deep sm:px-7 sm:py-3.5"
        >
          Shop the rack
        </Link>
      </div>
    );
  }

  // The receipt is only shown once the payment was actually confirmed
  // (status "paid") or the order was fulfilled ("delivered").
  const paid = order.status === "paid" || order.status === "delivered";

  if (!paid) {
    // Unpaid order: send the buyer to complete payment. (Orders without a
    // phone can't be paid — show a neutral message instead of looping.)
    if (order.phone) {
      redirect(`/payment-pending?token=${token}`);
    }
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-20 text-center sm:py-24">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream sm:h-16 sm:w-16">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 text-taupe"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
            <path d="M11 18.5h2" />
          </svg>
        </div>
        <h1 className="font-display text-2xl text-espresso sm:text-3xl">
          Payment not yet confirmed
        </h1>
        <p className="max-w-sm text-sm text-mocha">
          This order hasn&rsquo;t been paid yet, so there&rsquo;s no receipt to
          show. Complete the Mobile Money prompt on your phone to confirm it.
        </p>
        <Link
          href="/#shop"
          className="mt-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-clay-deep sm:px-7 sm:py-3.5"
        >
          Back to the rack
        </Link>
      </div>
    );
  }

  return <OrderReceipt order={order} />;
}
