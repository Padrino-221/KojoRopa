"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import type { LoginState } from "@/lib/actions/auth";
import { useSiteSetting } from "@/components/site-settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLogin() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );
  const siteName = useSiteSetting("siteName", "KojoRopa");

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-2xl tracking-tight text-espresso">
        {siteName}
      </p>
      <p className="mt-2 text-sm text-mocha">Admin access</p>
      <form action={formAction} className="mt-8 w-full">
        <label htmlFor="passcode" className="sr-only">
          Passcode
        </label>
        <Input
          id="passcode"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Passcode"
          className="text-center"
          autoFocus
        />
        <label htmlFor="auth-code" className="mt-4 block">
          <span className="sr-only">Authenticator code</span>
          <Input
            id="auth-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Authenticator code (if enabled)"
            className="text-center"
          />
        </label>
        {state.error && (
          <p className="mt-2 text-xs text-sale">{state.error}</p>
        )}
        <Button
          type="submit"
          disabled={pending}
          loading={pending}
          className="mt-3 w-full"
        >
          {pending ? "Signing in…" : "Enter dashboard"}
        </Button>
      </form>
      <Link
        href="/"
        className="mt-8 text-sm text-mocha hover:text-espresso"
      >
        ← Back to the shop
      </Link>
    </div>
  );
}
