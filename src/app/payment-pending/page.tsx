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
  if (order.status === "delivered") {
    redirect(`/confirmation?token=${token}`);
  }

  // If no Moolre session (sandbox or failed initiation), skip OTP and go to confirmation
  if (!order.moolreSessionId) {
    redirect(`/confirmation?token=${token}`);
  }

  return (
    <PaymentPendingClient
      orderId={order.id}
      token={token}
      amount={order.total}
      phone={order.phone || ""}
      paymentMessage="A USSD prompt has been sent to your phone. Enter the OTP code to confirm payment."
      initialStatus={order.status}
    />
  );
}
