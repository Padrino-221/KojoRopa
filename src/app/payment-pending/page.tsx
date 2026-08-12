import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOrderByToken } from "@/lib/queries";
import { PaymentPendingClient } from "./payment-pending-client";

export const metadata: Metadata = {
  title: "Complete Payment",
  robots: { index: false, follow: false },
};

export default async function PaymentPendingPage(
  props: PageProps<"/payment-pending">
) {
  const qp = await props.searchParams;
  const token =
    typeof qp.token === "string" && qp.token.trim() ? qp.token.trim() : null;

  if (!token) {
    redirect("/#shop");
  }

  const order = await getOrderByToken(token);

  if (!order) {
    redirect("/#shop");
  }

  // If payment already confirmed, go straight to confirmation
  // (status is "paid" until the admin marks the order "delivered")
  if (order.status === "paid" || order.status === "delivered") {
    redirect(`/confirmation?token=${token}`);
  }

  // If order has no phone number, something went wrong — skip to confirmation
  if (!order.phone) {
    redirect(`/confirmation?token=${token}`);
  }

  // Payment initiation failed if we never got a session or transaction id
  const paymentInitiated = Boolean(order.moolreSessionId || order.moolreTransactionId);

  return (
    <PaymentPendingClient
      orderId={order.id}
      token={token}
      amount={order.total}
      phone={order.phone}
      paymentInitiated={paymentInitiated}
      initialStatus={order.status}
    />
  );
}
