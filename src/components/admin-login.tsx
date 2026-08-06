"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  verifyPasswordAction,
  verifyTotpAction,
} from "@/lib/actions/auth";
import type { VerifyPasswordState, VerifyTotpState } from "@/lib/actions/auth";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

function LockIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function AdminLogin() {
  const siteName = useSiteSetting("siteName", "Kojosropa");

  const [pwState, pwAction, pwPending] = useActionState<
    VerifyPasswordState,
    FormData
  >(verifyPasswordAction, {});

  const [totpState, totpAction, totpPending] = useActionState<
    VerifyTotpState,
    FormData
  >(verifyTotpAction, {});

  const showTotp = pwState.step === "totp";

  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4 py-16">
      {/* ambient colour glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-clay/[0.07] blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-espresso/[0.05] blur-3xl" />
      </div>

      <div className="w-full max-w-sm animate-fade-up">
        {/* brand */}
        <div className="flex flex-col items-center text-center">
          <Brand
            name={siteName}
            logoClassName="h-10 w-auto sm:h-12"
            nameClassName="font-display text-2xl tracking-tight"
          />
          <p className="mt-2 text-sm text-mocha">Admin access</p>
        </div>

        {/* card */}
        <div className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-8">
          {/* step 1 — password */}
          {!showTotp && (
            <form action={pwAction} className="animate-fade-in space-y-4">
              <div>
                <Label htmlFor="password" required>
                  Password
                </Label>
                <div className="relative">
                  <LockIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-taupe" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Checkbox
                  id="rememberMe"
                  name="rememberMe"
                  label="Remember me for 30 days"
                />
              </div>

              {pwState.error && (
                <p
                  role="alert"
                  className="animate-fade-in rounded-xl bg-sale/10 px-3 py-2 text-center text-xs text-sale"
                >
                  {pwState.error}
                </p>
              )}

              <Button
                type="submit"
                disabled={pwPending}
                loading={pwPending}
                className="w-full"
              >
                {pwPending ? "Verifying…" : "Continue"}
              </Button>
            </form>
          )}

          {/* step 2 — TOTP */}
          {showTotp && (
            <form action={totpAction} className="animate-fade-in space-y-4">
              <input type="hidden" name="token" value={pwState.token ?? ""} />
              <div className="flex items-start gap-3 rounded-2xl bg-cream p-3.5">
                <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                <p className="text-sm leading-relaxed text-mocha">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <div>
                <Label htmlFor="totp-code" required>
                  Authenticator code
                </Label>
                <Input
                  id="totp-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-lg tracking-[0.3em]"
                  autoFocus
                />
              </div>

              <div className="flex justify-center">
                <Checkbox
                  id="rememberMe"
                  name="rememberMe"
                  label="Remember me for 30 days"
                />
              </div>

              {totpState.error && (
                <p
                  role="alert"
                  className="animate-fade-in rounded-xl bg-sale/10 px-3 py-2 text-center text-xs text-sale"
                >
                  {totpState.error}
                </p>
              )}

              <Button
                type="submit"
                disabled={totpPending}
                loading={totpPending}
                className="w-full"
              >
                {totpPending ? "Verifying…" : "Sign in"}
              </Button>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full text-center text-sm text-mocha transition-colors hover:text-espresso"
              >
                ← Back to password
              </button>
            </form>
          )}
        </div>

        {/* secured note */}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-taupe">
          <LockIcon className="h-3 w-3" />
          Secured area — authorised staff only
        </p>

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-mocha transition-colors hover:text-espresso"
        >
          ← Back to the shop
        </Link>
      </div>
    </div>
  );
}
