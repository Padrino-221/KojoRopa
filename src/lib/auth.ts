import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "kojoropa-session";
export const SESSION_MAX_AGE_SECONDS = Number(process.env.SESSION_MAX_AGE_SECONDS) || 60 * 60 * 24 * 7; // 7 days default
const REMEMBER_ME_DAYS = 30;
const TEMP_TOKEN_SECONDS = 5 * 60; // 5 minutes for password-verified temp token

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters."
    );
  }
  return new TextEncoder().encode(secret);
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Constant-time-ish password check against ADMIN_PASSWORD. */
export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  return safeEqual(password, expected);
}

/* ————— optional TOTP 2FA (RFC 6238) ————— */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/[\s-]/g, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 10 ** digits).toString().padStart(digits, "0");
}

/**
 * Verifies a 6-digit TOTP code against ADMIN_TOTP_SECRET (base32).
 * Returns true when no secret is configured (2FA disabled).
 */
export function verifyTotp(code: string, window = 1): boolean {
  const secretB32 = process.env.ADMIN_TOTP_SECRET;
  if (!secretB32) return true;
  if (!/^\d{6}$/.test(code)) return false;
  const secret = base32Decode(secretB32);
  const step = 30;
  const current = Math.floor(Date.now() / 1000 / step);
  for (let i = -window; i <= window; i++) {
    const expected = hotp(secret, current + i, 6);
    if (safeEqual(code, expected)) return true;
  }
  return false;
}

/** True when ADMIN_TOTP_SECRET is configured (2FA is active). */
export function isTotpEnabled(): boolean {
  return !!process.env.ADMIN_TOTP_SECRET;
}

/* ————— temp token for two-step login ————— */

interface TempTokenPayload {
  purpose: "password-verified";
}

/** Creates a short-lived JWT proving the password was verified (for step 1 → step 2). */
export async function createTempToken(): Promise<string> {
  return new SignJWT({ purpose: "password-verified" } satisfies TempTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime(`${TEMP_TOKEN_SECONDS}s`)
    .sign(getSecret());
}

/** Verifies a temp token. Returns true if valid. */
export async function verifyTempToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.purpose === "password-verified";
  } catch {
    return false;
  }
}

/* ————— sessions ————— */

interface AdminJwtPayload {
  role: "admin";
  jti: string;
}

/** Creates a JWT and stores a matching server-side session row. */
export async function createAdminSession(rememberMe = false): Promise<string> {
  const jti = randomBytes(16).toString("hex");
  const maxAge = rememberMe ? REMEMBER_ME_DAYS * 24 * 60 * 60 : SESSION_MAX_AGE_SECONDS;
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  const token = await new SignJWT({ role: "admin", jti } satisfies AdminJwtPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecret());

  await prisma.adminSession.create({ data: { jti, expiresAt } });
  return token;
}

/** True when the request carries a valid, still-registered admin session. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const jti = payload.jti;
    if (typeof jti !== "string" || jti.length === 0) return false;
    const session = await prisma.adminSession.findUnique({ where: { jti } });
    if (!session) return false;
    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.adminSession.deleteMany({ where: { jti } });
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Revokes the current session server-side and clears the cookie. */
export async function logoutAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      if (typeof payload.jti === "string") {
        await prisma.adminSession.deleteMany({ where: { jti: payload.jti } });
      }
    } catch {
      /* token already invalid — nothing to revoke */
    }
  }
  store.delete(SESSION_COOKIE);
}

/** Deletes every admin session, e.g. after rotating secrets. */
export async function revokeAllAdminSessions(): Promise<void> {
  await prisma.adminSession.deleteMany({});
}
