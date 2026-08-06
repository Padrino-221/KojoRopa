"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createAdminSession,
  createTempToken,
  verifyTempToken,
  logoutAdmin,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifyAdminPassword,
  verifyTotp,
  isTotpEnabled,
} from "@/lib/auth";
import { ADMIN_PATH } from "@/lib/site-config";
import { logAudit } from "@/lib/audit";
import { rateLimit, rateLimitGlobal } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

/* ————— Step 1: verify password ————— */

export type VerifyPasswordState =
  | { error?: string; step?: undefined }
  | { needsTotp: true; token: string; step: "totp" };

export async function verifyPasswordAction(
  _prev: VerifyPasswordState,
  formData: FormData
): Promise<VerifyPasswordState> {
  const ip = await getClientIp();

  if (
    !rateLimit(`login:${ip}`, 10, 60_000) ||
    !rateLimitGlobal("login", 30, 60_000)
  ) {
    return { error: "Too many attempts — try again in a minute." };
  }

  const password = formData.get("password");
  if (typeof password !== "string" || !password) {
    return { error: "Enter your password." };
  }

  if (!(await verifyAdminPassword(password))) {
    await logAudit("login.failed", "wrong password", ip);
    return { error: "Wrong password." };
  }

  if (!isTotpEnabled()) {
    await logAudit("login.success", "admin signed in (no 2FA)", ip);
    const token = await createAdminSession();
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    redirect(`/${ADMIN_PATH}`);
  }

  const tempToken = await createTempToken();
  return { needsTotp: true, token: tempToken, step: "totp" };
}

/* ————— Step 2: verify TOTP ————— */

export type VerifyTotpState = { error?: string };

export async function verifyTotpAction(
  _prev: VerifyTotpState,
  formData: FormData
): Promise<VerifyTotpState> {
  const ip = await getClientIp();

  if (
    !rateLimit(`totp:${ip}`, 10, 60_000) ||
    !rateLimitGlobal("totp", 30, 60_000)
  ) {
    return { error: "Too many attempts — try again in a minute." };
  }

  const token = formData.get("token");
  const code = formData.get("code");
  const rememberMe = formData.get("rememberMe") === "on";

  if (typeof token !== "string" || !token) {
    return { error: "Session expired — go back and enter your password." };
  }

  if (!await verifyTempToken(token)) {
    await logAudit("login.failed", "invalid temp token", ip);
    return { error: "Session expired — go back and enter your password." };
  }

  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return { error: "Enter the 6-digit code from your authenticator." };
  }

  if (!verifyTotp(code)) {
    await logAudit("login.failed", "invalid 2FA code", ip);
    return { error: "Invalid authenticator code." };
  }

  await logAudit("login.success", "admin signed in (2FA)", ip);

  const sessionToken = await createAdminSession(rememberMe);
  const store = await cookies();
  const maxAge = rememberMe
    ? 30 * 24 * 60 * 60
    : SESSION_MAX_AGE_SECONDS;
  store.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  redirect(`/${ADMIN_PATH}`);
}

/* ————— Logout ————— */

export async function logoutAction(): Promise<void> {
  await logAudit("logout", "admin signed out");
  await logoutAdmin();
  redirect(`/${ADMIN_PATH}`);
}
