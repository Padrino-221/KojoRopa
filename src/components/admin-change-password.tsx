"use client";

import { useState, type FormEvent } from "react";
import { changePasswordAction } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await changePasswordAction(current, next);
      if (res.ok) {
        setDone(true);
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setError(res.error ?? "Failed to change password.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {done && (
        <div className="rounded-xl border border-olive/30 bg-olive/5 px-4 py-3 text-sm text-olive">
          Password updated — use it next time you sign in.
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
          {error}
        </div>
      )}
      <div>
        <Label htmlFor="pw-current">Current password</Label>
        <Input
          id="pw-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Your current password"
        />
      </div>
      <div>
        <Label htmlFor="pw-new">New password</Label>
        <Input
          id="pw-new"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <Label htmlFor="pw-confirm">Confirm new password</Label>
        <Input
          id="pw-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat the new password"
        />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" variant="secondary" loading={busy} disabled={busy}>
          Change password
        </Button>
        <p className="text-xs text-taupe">
          Overrides the ADMIN_PASSWORD environment variable.
        </p>
      </div>
    </form>
  );
}
