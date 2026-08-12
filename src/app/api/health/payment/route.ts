import { NextResponse } from "next/server";
import { rateLimit, rateLimitGlobal } from "@/lib/rate-limit";
import { getMoolreBaseUrl, getConfig } from "@/lib/moolre";

/**
 * Payment-provider connectivity probe.
 *
 * Reproduces the exact request the store sends to Moolre when initiating a
 * payment, but with a deliberately invalid payer phone number — so it never
 * prompts a real device and never moves money. Its purpose is production
 * troubleshooting: if checkout shows "Network error talking to the payment
 * provider", hitting this endpoint from the same runtime reveals the real
 * reason (malformed MOOLRE_BASE_URL, unreachable host, TLS failure, or a
 * credentials mismatch).
 *
 * The response includes the raw MOOLRE_BASE_URL string (a URL is not secret)
 * and booleans for which credentials are set — never the credential values.
 */
export async function GET(req: Request) {
  // Best-effort abuse guard (in-memory, per-instance on serverless).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (
    !rateLimit(`health-payment:${ip}`, 10, 60_000) ||
    !rateLimitGlobal("health-payment", 40, 60_000)
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Mirror the app exactly: same normalized base URL and cleaned credentials.
  let cfg: { user: string; pubKey: string; accountId: string; secret?: string } | null = null;
  try {
    cfg = getConfig();
  } catch {
    cfg = null;
  }
  const user = cfg?.user;
  const pubKey = cfg?.pubKey;
  const accountId = cfg?.accountId;

  const env = {
    // The raw stored value (may show stray quotes/whitespace from a paste).
    baseUrl: process.env.MOOLRE_BASE_URL || "(unset — code defaults to https://sandbox.moolre.com)",
    // The value the app actually uses after quote/whitespace stripping.
    effectiveBaseUrl: getMoolreBaseUrl(),
    apiUserSet: Boolean(user),
    pubKeySet: Boolean(pubKey),
    accountIdSet: Boolean(accountId),
    secretSet: Boolean(cfg?.secret),
  };

  if (!user || !pubKey || !accountId) {
    return NextResponse.json({
      ok: false,
      env,
      verdict: "Cannot probe: one or more MOOLRE_API_USER / MOOLRE_PUB_KEY / MOOLRE_ACCOUNT_ID are unset. Add them in Vercel → Settings → Environment Variables (Production), then redeploy.",
    });
  }

  // Same body shape as src/lib/moolre.ts initiatePayment, but with an
  // all-zero subscriber number that cannot receive a prompt.
  const body = {
    type: 1,
    channel: "13",
    currency: "GHS",
    payer: "0550000000", // invalid subscriber — no prompt, no charge
    amount: "1.00",
    externalref: "HEALTH-" + Date.now().toString(36),
    reference: "connectivity probe",
    otpcode: "",
    sessionid: "",
    accountnumber: accountId,
  };

  try {
    const res = await fetch(`${getMoolreBaseUrl()}/open/transact/payment`, {
      method: "POST",
      headers: {
        "X-API-USER": user,
        "X-API-PUBKEY": pubKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const httpStatus = res.status;
    const text = await res.text();

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({
        ok: false,
        env,
        httpStatus,
        verdict: `Moolre returned a non-JSON response (HTTP ${httpStatus}) — the host behind this URL is not the payment API.`,
        bodyPreview: text.slice(0, 200),
      });
    }
    if (!parsed) {
      return NextResponse.json({ ok: false, env, httpStatus, verdict: "Empty response from Moolre." });
    }
    const moolre = parsed;

    const mcode = typeof moolre.code === "string" ? moolre.code : "";
    const message = typeof moolre.message === "string" ? moolre.message : "";
    const rawStatus = moolre.status;

    let verdict: string;
    if (String(rawStatus) === "1") {
      verdict = "Moolre accepted the probe as a valid payment initiation — connection AND credentials are OK. Real initiations should work from this runtime.";
    } else if (mcode === "TR03" || /phone/i.test(message)) {
      verdict = "Connection + authentication OK. Moolre only rejected the probe's deliberately invalid phone number — checkout initiation should work.";
    } else if (mcode.startsWith("AIN") || /auth/i.test(message)) {
      verdict = "Moolre rejected the credentials for this endpoint. The MOOLRE_API_USER / MOOLRE_PUB_KEY / MOOLRE_ACCOUNT_ID in this runtime do not authenticate against the base URL above (sandbox vs production keys are separate).";
    } else {
      verdict = `Moolre answered with code ${mcode || "?"}: ${message || "no message"}`;
    }

    return NextResponse.json({
      ok: true,
      env,
      httpStatus,
      moolre: { status: String(rawStatus), code: mcode, message },
      verdict,
    });
  } catch (err) {
    const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
    return NextResponse.json({
      ok: false,
      env,
      verdict:
        "The fetch threw (network-level failure, not an auth error). Typical causes: MOOLRE_BASE_URL with stray quotes/spaces (Vercel stores values literally), a typo in the URL, DNS/TLS failure, or the host blocking this runtime.",
      error: String(err),
      cause: cause ? (typeof cause === "object" ? JSON.stringify(cause) : String(cause)) : undefined,
    });
  }
}
