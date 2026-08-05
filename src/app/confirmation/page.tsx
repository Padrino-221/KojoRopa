import type { Metadata } from "next";
import Link from "next/link";
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
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cream text-3xl sm:h-16 sm:w-16">
          🧭
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

  return <OrderReceipt order={order} />;
}
