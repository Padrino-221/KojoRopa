"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  verifyPasswordAction,
  verifyTotpAction,
} from "@/lib/actions/auth";
import type { VerifyPasswordState, VerifyTotpState } from "@/lib/actions/auth";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export function AdminLogin() {
  const siteName = useSiteSetting("siteName", "KojoRopa");

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
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-24 text-center">
      {/* brand */}
      <p className="font-display text-2xl tracking-tight text-espresso">
        {siteName}
      </p>
      <p className="mt-2 text-sm text-mocha">Admin access</p>

      {/* step 1 — password */}
      {!showTotp && (
        <form action={pwAction} className="mt-8 w-full">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            className="text-center"
            autoFocus
          />
          <div className="mt-4 flex justify-center">
            <Checkbox id="rememberMe" name="rememberMe" label="Remember me for 30 days" />
          </div>
          {pwState.error && (
            <p className="mt-3 text-xs text-sale">{pwState.error}</p>
          )}
          <Button
            type="submit"
            disabled={pwPending}
            loading={pwPending}
            className="mt-4 w-full"
          >
            {pwPending ? "Verifying…" : "Continue"}
          </Button>
        </form>
      )}

      {/* step 2 — TOTP */}
      {showTotp && (
        <form action={totpAction} className="mt-8 w-full">
          <input type="hidden" name="token" value={pwState.token ?? ""} />
          <p className="mb-4 text-sm text-mocha">
            Enter the 6-digit code from your authenticator app.
          </p>
          <label htmlFor="totp-code" className="sr-only">
            Authenticator code
          </label>
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
          <div className="mt-4 flex justify-center">
            <Checkbox id="rememberMe" name="rememberMe" label="Remember me for 30 days" />
          </div>
          {totpState.error && (
            <p className="mt-3 text-xs text-sale">{totpState.error}</p>
          )}
          <Button
            type="submit"
            disabled={totpPending}
            loading={totpPending}
            className="mt-4 w-full"
          >
            {totpPending ? "Verifying…" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-mocha hover:text-espresso"
          >
            ← Back to password
          </button>
        </form>
      )}

      <Link
        href="/"
        className="mt-8 text-sm text-mocha hover:text-espresso"
      >
        ← Back to the shop
      </Link>
    </div>
  );
}
