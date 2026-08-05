"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createAdminSession,
  logoutAdmin,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifyAdminPassword,
  verifyTotp,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { rateLimit, rateLimitGlobal } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";
import { loginSchema } from "@/lib/validators";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const ip = await getClientIp();

  // Per-IP cap (prevents hammering from one address) plus a global cap that
  // a spoofed X-Forwarded-For cannot dodge.
  if (
    !rateLimit(`login:${ip}`, 10, 60_000) ||
    !rateLimitGlobal("login", 30, 60_000)
  ) {
    return { error: "Too many attempts — try again in a minute." };
  }

  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { error: "Enter your password." };
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    await logAudit("login.failed", "wrong password", ip);
    return { error: "Wrong password." };
  }

  if (!verifyTotp(parsed.data.code ?? "")) {
    await logAudit("login.failed", "invalid 2FA code", ip);
    return { error: "Invalid authenticator code." };
  }

  await logAudit("login.success", "admin signed in", ip);

  const token = await createAdminSession();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await logAudit("logout", "admin signed out");
  await logoutAdmin();
  redirect("/admin");
}
