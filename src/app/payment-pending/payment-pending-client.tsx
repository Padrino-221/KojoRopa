"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { formatPrice } from "@/lib/format";
import { submitOtpAction, checkPaymentAction, retryPaymentAction } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface PaymentPendingClientProps {
  orderId: string;
  token: string;
  amount: number;
  phone: string;
  paymentMessage: string;
  paymentInitiated: boolean;
  initialStatus: string;
}

export function PaymentPendingClient({
  orderId,
  token,
  amount,
  phone,
  paymentMessage,
  paymentInitiated,
  initialStatus,
}: PaymentPendingClientProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // "paid" tracks whether the payment went through. The order itself stays
  // "pending" until the admin marks it delivered — so we can't use the order
  // status as the payment-confirmed signal anymore.
  const [paid, setPaid] = useState(initialStatus === "delivered");
  const [initiated, setInitiated] = useState(paymentInitiated);

  const handleCheckStatus = useCallback(async () => {
    setChecking(true);
    const res = await checkPaymentAction(orderId);
    if (res.ok && res.paid) {
      setPaid(true);
      setSuccess("Payment confirmed!");
    }
    setChecking(false);
  }, [orderId]);

  // Auto-check payment status every 10 seconds until paid
  useEffect(() => {
    if (paid || !initiated) return;
    const interval = setInterval(handleCheckStatus, 10_000);
    return () => clearInterval(interval);
  }, [paid, initiated, handleCheckStatus]);

  // Redirect to confirmation once payment is confirmed
  useEffect(() => {
    if (paid) {
      const timer = setTimeout(() => {
        router.push(`/confirmation?token=${token}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [paid, token, router]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    setError(null);
    const res = await retryPaymentAction(orderId);
    setRetrying(false);
    if (res.ok) {
      setInitiated(true);
      setSuccess("A new USSD prompt has been sent to your phone.");
    } else {
      setError(res.error);
    }
  };

  const handleSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !otp.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await submitOtpAction(orderId, otp.trim());
      console.log("[payment-pending] submitOtp result:", res);
      setSubmitting(false);

      if (res.ok) {
        setSuccess(res.message);
        setPaid(true);
      } else {
        setError(res.error);
      }
    } catch (err) {
      console.error("[payment-pending] submitOtp error:", err);
      setSubmitting(false);
      setError("Something went wrong. Please try again.");
    }
  };

  if (paid) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-clay/10 text-3xl text-clay">
          ✓
        </div>
        <h1 className="font-display text-2xl text-espresso sm:text-3xl">
          Payment Confirmed
        </h1>
        <p className="max-w-sm text-sm text-mocha">
          {success || "Your payment has been confirmed. Redirecting to your receipt..."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:py-20">
      <Card padding="lg">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand">
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
          <h1 className="mt-4 font-display text-2xl text-espresso">
            Complete Payment
          </h1>
          {initiated ? (
            <p className="mt-2 text-sm text-mocha">
              A USSD prompt has been sent to <strong>{phone}</strong>.
              Enter the OTP code you received below.
            </p>
          ) : (
            <p className="mt-2 text-sm text-sale">
              Your payment could not be initiated. Try sending the prompt again.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-surface p-4 ring-1 ring-border/50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-mocha">Order</span>
            <span className="font-medium text-espresso">{orderId}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-mocha">Amount</span>
            <span className="font-display text-xl font-semibold text-espresso">
              {formatPrice(amount)}
            </span>
          </div>
        </div>

        {success && !error && (
          <p className="mt-4 text-center text-xs font-medium text-clay">
            {success}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-center text-xs text-sale">
            {error}
          </p>
        )}

        {initiated ? (
          <form onSubmit={handleSubmitOtp} className="mt-6 space-y-4">
            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-espresso">
                OTP Code
              </label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="mt-1 text-center text-lg tracking-[0.3em]"
                maxLength={6}
                autoFocus
              />
              <p className="mt-1.5 text-xs text-taupe">
                Check your phone for the code sent via SMS.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting || otp.length < 4}
              loading={submitting}
              className="w-full py-3.5"
            >
              {submitting ? "Verifying…" : "Confirm Payment"}
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            loading={retrying}
            className="mt-6 w-full py-3.5"
          >
            {retrying ? "Sending prompt…" : "Retry Payment"}
          </Button>
        )}

        {initiated && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleCheckStatus}
              disabled={checking}
              className="text-xs text-taupe underline-offset-2 hover:underline disabled:opacity-50"
            >
              {checking ? "Checking…" : "Payment already went through? Check status"}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-taupe">
          Didn&apos;t receive the code?{" "}
          <Link href="/#shop" className="underline underline-offset-2 hover:text-espresso">
            Contact us
          </Link>
        </p>
      </Card>
    </div>
  );
}
