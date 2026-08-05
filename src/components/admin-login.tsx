"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import type { LoginState } from "@/lib/actions/auth";

const inputClass =
  "w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-espresso ring-1 ring-border placeholder:text-taupe focus:border-clay focus:ring-2 focus:ring-clay/20 focus:outline-none";

export function AdminLogin() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {}
  );

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-2xl tracking-tight text-espresso">
        Kojo<span className="text-clay">Ropa</span>
      </p>
      <p className="mt-2 text-sm text-mocha">Admin access</p>
      <form action={formAction} className="mt-8 w-full">
        <label htmlFor="passcode" className="sr-only">
          Passcode
        </label>
        <input
          id="passcode"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Passcode"
          className={`${inputClass} text-center`}
          autoFocus
        />
        <label htmlFor="auth-code" className="mt-4 block">
          <span className="sr-only">Authenticator code</span>
          <input
            id="auth-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Authenticator code (if enabled)"
            className={`${inputClass} text-center`}
          />
        </label>
        {state.error && (
          <p className="mt-2 text-xs text-sale">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 w-full rounded-full bg-clay py-3 text-sm font-medium text-white transition-colors hover:bg-clay-deep disabled:cursor-wait disabled:opacity-70"
        >
          {pending ? "Signing in…" : "Enter dashboard"}
        </button>
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
