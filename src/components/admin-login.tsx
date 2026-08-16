"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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

function ShieldIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function WarningIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function AdminLogin() {
  const siteName = useSiteSetting("siteName", "Kojosropa");
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="relative flex h-screen items-center justify-center overflow-hidden px-4">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-clay/[0.07] blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-espresso/[0.05] blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] animate-fade-up">
        {/* brand */}
        <div className="mb-8 text-center">
          <Brand
            name={siteName}
            logoClassName="h-10 w-auto sm:h-12"
            nameClassName="font-display text-3xl tracking-tight"
          />
          <p className="mt-2 text-sm text-taupe">Admin access</p>
        </div>

        {/* card */}
        <div className="rounded-3xl border border-sand bg-white p-8">
          {/* step 1 — password */}
          {!showTotp && (
            <form action={pwAction} className="animate-fade-in">
              <h2 className="font-display text-xl font-semibold text-espresso text-center">
                Welcome back
              </h2>
              <p className="text-center text-sm text-taupe mt-1 mb-6">
                Sign in to manage the rack
              </p>

              {/* error */}
              {pwState.error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-clay/20 bg-clay/5 px-3 py-2.5">
                  <WarningIcon className="h-4 w-4 shrink-0 text-clay" />
                  <p className="text-sm text-clay">{pwState.error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="password" required>
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <LockIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-taupe" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className="pl-10 pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-taupe transition-colors hover:text-mocha"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Checkbox
                    id="rememberMe"
                    name="rememberMe"
                    label="Remember me for 30 days"
                  />
                  <button
                    type="button"
                    className="text-sm font-medium text-clay transition-colors hover:text-clay-deep"
                  >
                    Forgot?
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={pwPending}
                  loading={pwPending}
                  className="w-full font-display"
                >
                  {pwPending ? "Verifying…" : "Continue"}
                </Button>
              </div>
            </form>
          )}

          {/* step 2 — TOTP */}
          {showTotp && (
            <form action={totpAction} className="animate-fade-in">
              <input type="hidden" name="token" value={pwState.token ?? ""} />

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mb-4 flex items-center gap-1.5 text-sm text-mocha transition-colors hover:text-espresso"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Back
              </button>

              <h2 className="font-display text-xl font-semibold text-espresso text-center">
                Two-factor auth
              </h2>
              <p className="text-center text-sm text-taupe mt-1 mb-5">
                Enter the code from your authenticator app
              </p>

              {/* info box */}
              <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-clay/20 bg-clay/5 p-3.5">
                <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                <p className="text-sm leading-relaxed text-mocha">
                  Open your authenticator app and enter the 6-digit verification code.
                </p>
              </div>

              {/* error */}
              {totpState.error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-clay/20 bg-clay/5 px-3 py-2.5">
                  <WarningIcon className="h-4 w-4 shrink-0 text-clay" />
                  <p className="text-sm text-clay">{totpState.error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="totp-code" required>
                    Authenticator code
                  </Label>
                  <div className="relative mt-1.5">
                    <ShieldIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-taupe" />
                    <Input
                      id="totp-code"
                      name="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      className="pl-10 text-center text-lg font-display tracking-[0.3em]"
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={totpPending}
                  loading={totpPending}
                  className="w-full font-display"
                >
                  {totpPending ? "Verifying…" : "Verify & sign in"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* secured note */}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-taupe">
          <ShieldIcon className="h-3 w-3" />
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
