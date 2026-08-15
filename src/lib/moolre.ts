import { createHash, timingSafeEqual } from "node:crypto";

// Sandbox is the safe default for development, but it means NO real money
// moves. The live production endpoint is https://api.moolre.com.

/**
 * Vercel stores env values literally — a value pasted from a .env file arrives
 * WITH its surrounding quotes ("https://..."). Strip quotes and whitespace so
 * a misconfigured copy-paste can't silently break payments or webhooks.
 */
function cleanEnvValue(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let v = raw.trim();
  if (v.length >= 2 && v.startsWith("\"") && v.endsWith("\"")) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

const MOOLRE_BASE = (cleanEnvValue(process.env.MOOLRE_BASE_URL) || "https://sandbox.moolre.com").replace(/\/+$/, "");

/** The effective payment API base URL (quotes/whitespace already stripped). */
export function getMoolreBaseUrl(): string {
  return MOOLRE_BASE;
}

if (MOOLRE_BASE.includes("sandbox")) {
  console.warn(
    "[moolre] WARNING: MOOLRE_BASE_URL points at the Moolre SANDBOX — payments are test-only and no real money moves. To accept live payments set MOOLRE_BASE_URL=https://api.moolre.com and use your production credentials."
  );
}

export function getConfig() {
  const user = cleanEnvValue(process.env.MOOLRE_API_USER);
  const pubKey = cleanEnvValue(process.env.MOOLRE_PUB_KEY);
  const accountId = cleanEnvValue(process.env.MOOLRE_ACCOUNT_ID);
  const secret = cleanEnvValue(process.env.MOOLRE_SECRET);

  if (!user || !pubKey || !accountId) {
    throw new Error("Missing Moolre environment variables: MOOLRE_API_USER, MOOLRE_PUB_KEY, MOOLRE_ACCOUNT_ID");
  }

  return { user, pubKey, accountId, secret };
}

interface MoolreResponse {
  status: number;
  code: string;
  message: string | string[];
  data: unknown;
  go: unknown;
}

/**
 * Moolre's TP14/TP17 envelopes put the literal placeholder string "all" in
 * the `data` field — it is NOT a session token. Echoing it back as
 * `sessionid` makes Moolre treat the request as a USSD-session call: it
 * verifies the phone (TP17) and skips creating the charge. Only accept a
 * `data` value that actually looks like a real reference (UUID etc).
 */
function isUsableToken(v: string | undefined): v is string {
  return !!v && v !== "all" && v.length >= 8;
}

/** Extracts a safe, PII-free technical description from a thrown fetch error. */
function fetchErrorDetail(err: unknown): string {
  const primary = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
  if (!cause) return primary;
  const detail = typeof cause === "object" && cause !== null ? JSON.stringify(cause) : String(cause);
  return `${primary} — ${detail}`;
}

interface PaymentParams {
  phone: string;
  amount: number;
  externalRef: string;
  reference?: string;
}

interface PaymentResult {
  success: boolean;
  code?: string;
  message?: string;
  transactionId?: string;
  sessionId?: string;
  requiresOtp?: boolean;
  /** Internal-only: the raw technical reason when the call failed at the network level. */
  technical?: string;
  /** The raw Moolre response envelope, for the audit trail (debugging). */
  gatewayDetail?: string;
}

/** Normalizes a Ghanaian phone number to local format (0XXXXXXXXX). */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233")) return "0" + digits.slice(3);
  if (digits.startsWith("0")) return digits;
  return "0" + digits;
}

/**
 * Returns the Moolre channel number for a normalized Ghanaian phone number.
 *  13 = MTN Mobile Money      (024, 025, 053, 054, 055, 059)
 *  6 = Telecel/Vodafone Cash (020, 050)
 *  7 = AirtelTigo Money      (026, 027, 056, 057)
 *
 * Defaults to MTN (13) for unrecognised prefixes.
 */
export function getMoolreChannel(normalizedPhone: string): string {
  const prefix3 = normalizedPhone.slice(0, 3);
  const telecelPrefixes = ["020", "050"];
  const airteltigoPrefixes = ["026", "027", "056", "057"];
  if (telecelPrefixes.includes(prefix3)) return "6";
  if (airteltigoPrefixes.includes(prefix3)) return "7";
  return "13"; // MTN
}

/**
 * Initiate a Mobile Money payment via Moolre.
 * Sends a USSD prompt to the customer's phone.
 */
export async function initiatePayment(params: PaymentParams): Promise<PaymentResult> {
  const { user, pubKey, accountId } = getConfig();

  const phone = normalizePhone(params.phone);

  const channel = getMoolreChannel(phone);

  const body = {
    type: 1,
    channel,
    currency: "GHS",
    payer: phone,
    amount: params.amount.toFixed(2),
    externalref: params.externalRef,
    reference: params.reference || `Payment for order ${params.externalRef}`,
    otpcode: "",
    sessionid: "",
    accountnumber: accountId,
  };

  let res: Response;
  try {
    res = await fetch(`${MOOLRE_BASE}/open/transact/payment`, {
      method: "POST",
      headers: {
        "X-API-USER": user,
        "X-API-PUBKEY": pubKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[moolre] initiatePayment fetch error:", String(err));
    return {
      success: false,
      message: "Network error talking to the payment provider.",
      technical: fetchErrorDetail(err),
    };
  }

  const text = await res.text();
  let data: MoolreResponse;
  try {
    data = JSON.parse(text);
  } catch {
    console.error(`[moolre] initiatePayment non-JSON response (HTTP ${res.status})`);
    return { success: false, message: "Unexpected response from the payment provider." };
  }

  const ref = typeof data.data === "string" ? data.data : "";
  const gatewayDetail = JSON.stringify({
    status: data.status,
    code: data.code,
    message: data.message,
    data: data.data,
  });

  // OTP challenge — Moolre returns code TP14 (often with status 1) when the
  // SMS OTP has been dispatched but NO charge has been made yet. This branch
  // must run BEFORE the status-1 check, because TP14 itself arrives with
  // status: 1. TP14's `data` is the placeholder "all" — never record it as a
  // session or transaction id (echoing it back breaks the OTP flow).
  if (data.code === "TP14") {
    console.log("[moolre] initiatePayment OTP required:", { code: data.code });
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "OTP sent to your phone",
      // Use a placeholder so the order record signals "payment was initiated"
      // without risking this value being echoed back to Moolre. isUsableToken
      // rejects strings shorter than 8 chars, so "pending" is safely ignored
      // by submitOtp — it collapses to an empty sessionid.
      sessionId: "pending",
      requiresOtp: true,
      gatewayDetail,
    };
  }

  if (Number(data.status) === 1) {
    // data is a plain string transaction reference (UUID), not an object
    console.log("[moolre] initiatePayment success:", { code: data.code });
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment initiated",
      transactionId: isUsableToken(ref) ? ref : undefined,
      requiresOtp: false,
      gatewayDetail,
    };
  }

  console.log("[moolre] initiatePayment failed:", { status: data.status, code: data.code });
  return {
    success: false,
    code: data.code,
    message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment failed",
    requiresOtp: false,
    gatewayDetail,
  };
}

/**
 * Submit OTP code for a Moolre payment.
 *
 * Per Moolre's docs, the OTP flow is: POST /open/transact/payment WITHOUT an
 * OTP → TP14 (SMS sent) → POST the SAME request with `otpcode` filled and
 * `sessionid` empty → TR099 (charge created, transaction UUID in `data`).
 *
 * Passing a non-empty sessionid here makes Moolre treat the call as a
 * USSD-session request: it verifies the phone (TP17) and skips creating the
 * charge. So we deliberately submit with an EMPTY sessionid unless the caller
 * provides a genuine token (never the TP14 placeholder "all").
 *
 * Belt-and-braces: if Moolre still answers TP17 (phone verified, no charge),
 * we immediately re-issue the same payment request without an OTP — the phone
 * is now verified, so the charge should be created on the second attempt. If
 * that also fails, the result stays unsuccessful so the order is never marked
 * paid without a real transaction.
 */
export async function submitOtp(params: {
  phone: string;
  amount: number;
  externalRef: string;
  otpCode: string;
  sessionId: string;
  transactionId?: string;
}): Promise<PaymentResult> {
  const { user, pubKey, accountId } = getConfig();

  const phone = normalizePhone(params.phone);

  const channel = getMoolreChannel(phone);

  // Only a genuine token (real UUID etc) is forwarded as sessionid; the TP14
  // placeholder "all" and empty values are sent as empty.
  const sessionId = isUsableToken(params.sessionId) ? params.sessionId : "";

  const makeRequest = async (otpcode: string): Promise<{ data: MoolreResponse; gatewayDetail: string; httpOk: boolean }> => {
    // Only include otpcode and sessionid when they have values. Sending
    // empty strings makes Moolre treat them as "field present but empty"
    // which can re-trigger OTP verification (TP14) instead of creating
    // the charge (TR099) after phone verification (TP17).
    const body: Record<string, string | number> = {
      type: 1,
      channel,
      currency: "GHS",
      payer: phone,
      amount: params.amount.toFixed(2),
      externalref: params.externalRef,
      reference: `Order ${params.externalRef}`,
      accountnumber: accountId,
    };
    if (otpcode) body.otpcode = otpcode;
    if (sessionId) body.sessionid = sessionId;

    const res = await fetch(`${MOOLRE_BASE}/open/transact/payment`, {
      method: "POST",
      headers: {
        "X-API-USER": user,
        "X-API-PUBKEY": pubKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let parsed: MoolreResponse;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        status: 0,
        code: "",
        message: `Non-JSON response (HTTP ${res.status})`,
        data: null,
        go: null,
      };
    }
    return {
      data: parsed,
      gatewayDetail: JSON.stringify({
        http: res.status,
        status: parsed.status,
        code: parsed.code,
        message: parsed.message,
        data: parsed.data,
      }),
      httpOk: res.ok,
    };
  };

  // Moolre's documented charge response is TR099 ("Payment request initiated
  // successfully") — the ONLY code we treat as a charge. Its `message` is often
  // null, so the caller supplies a friendly fallback.
  const isCharge = (r: { data: MoolreResponse; httpOk: boolean }) => r.data.code === "TR099";

  const envelopeMessage = (data: MoolreResponse) =>
    typeof data.message === "string"
      ? data.message
      : Array.isArray(data.message)
        ? data.message.join(", ")
        : "";

  let first: { data: MoolreResponse; gatewayDetail: string; httpOk: boolean };
  try {
    first = await makeRequest(params.otpCode);
  } catch (err) {
    console.error("[moolre] submitOtp fetch error:", String(err));
    return {
      success: false,
      message: "Network error talking to the payment provider.",
      technical: fetchErrorDetail(err),
    };
  }

  // OTP rejected — Moolre answers status 1 with TP14 when the submitted code
  // is wrong or expired. That is NOT a charge; no money has moved.
  if (first.data.code === "TP14") {
    console.log("[moolre] submitOtp OTP rejected:", { code: first.data.code });
    return {
      success: false,
      code: first.data.code,
      message: "That code was invalid or has expired. Check your phone for the latest code and try again.",
      requiresOtp: true,
      gatewayDetail: first.gatewayDetail,
    };
  }

  // The documented charge success code. `data` holds the transaction UUID.
  if (isCharge(first)) {
    const ref = typeof first.data.data === "string" ? first.data.data : "";
    console.log("[moolre] submitOtp success:", { code: first.data.code });
    return {
      success: true,
      code: first.data.code,
      message: envelopeMessage(first.data) || "Payment confirmed",
      transactionId: isUsableToken(ref) ? ref : undefined,
      gatewayDetail: first.gatewayDetail,
    };
  }

  // TP17 = "Phone no. Verification Successful." — the OTP was accepted but NO
  // charge was created. The phone is now verified, so re-issue the payment
  // request without the OTP to actually create the transaction. This is safe:
  // Moolre rejects duplicate externalrefs (TP13), so the re-issue cannot
  // double-charge — worst case it is refused and we surface the failure.
  if (first.data.code === "TP17") {
    console.log("[moolre] submitOtp TP17 (phone verified, no charge) — re-issuing payment request");
    let second: { data: MoolreResponse; gatewayDetail: string; httpOk: boolean };
    try {
      second = await makeRequest("");
    } catch (err) {
      console.error("[moolre] submitOtp (post-TP17) fetch error:", String(err));
      return {
        success: false,
        code: "TP17",
        message: "Your phone was verified but the charge has not completed. Please try again in a moment.",
        technical: fetchErrorDetail(err),
        gatewayDetail: first.gatewayDetail,
      };
    }

    if (isCharge(second)) {
      const ref = typeof second.data.data === "string" ? second.data.data : "";
      console.log("[moolre] submitOtp success after TP17:", { code: second.data.code });
      return {
        success: true,
        code: second.data.code,
        message: envelopeMessage(second.data) || "Payment confirmed",
        transactionId: isUsableToken(ref) ? ref : undefined,
        gatewayDetail: second.gatewayDetail,
      };
    }

    // The re-issue asked for a fresh OTP (TP14) or still created no charge.
    console.log("[moolre] submitOtp TP17 re-issue did not create a charge:", { code: second.data.code });
    const needsNewCode = second.data.code === "TP14";
    return {
      success: false,
      code: needsNewCode ? "TP14" : second.data.code || "TP17",
      message: needsNewCode
        ? "A new verification code was sent to your phone — enter it to continue."
        : "Your phone was verified but the charge could not be completed. Please try again — no money has been taken.",
      requiresOtp: needsNewCode,
      gatewayDetail: `${first.gatewayDetail} | ${second.gatewayDetail}`,
    };
  }

  return {
    success: false,
    code: first.data.code,
    message: envelopeMessage(first.data) || "Payment could not be confirmed.",
    gatewayDetail: first.gatewayDetail,
  };
}

/**
 * Check payment status via Moolre using the order's external reference.
 * The result is trusted as the server-to-server source of truth for whether a
 * transaction is actually paid.
 */
export async function checkPaymentStatus(params: {
  externalRef: string;
}): Promise<PaymentResult> {
  const { user, pubKey, accountId } = getConfig();

  let res: Response;
  try {
    res = await fetch(`${MOOLRE_BASE}/open/transact/status`, {
      method: "POST",
      headers: {
        "X-API-USER": user,
        "X-API-PUBKEY": pubKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: 1,
        idtype: "1", // 1 = unique externalref, 2 = Moolre generated ID
        id: params.externalRef,
        accountnumber: accountId,
      }),
    });
  } catch (err) {
    console.error("[moolre] checkStatus fetch error:", String(err));
    return {
      success: false,
      message: "Network error talking to the payment provider.",
      technical: fetchErrorDetail(err),
    };
  }

  const text = await res.text();
  let data: MoolreResponse;
  try {
    data = JSON.parse(text);
  } catch {
    return { success: false, message: "Invalid response" };
  }

  const gatewayDetail = JSON.stringify({
    status: data.status,
    code: data.code,
    message: data.message,
    data: data.data,
  });

  if (Number(data.status) === 1) {
    const obj = typeof data.data === "object" && data.data !== null ? data.data as Record<string, unknown> : null;
    const paid = String(obj?.txstatus) === "1";
    console.log("[moolre] checkPaymentStatus:", { code: data.code, paid });
    return {
      success: paid,
      code: data.code,
      message: typeof data.message === "string" ? data.message : paid ? "Payment successful" : "Payment not yet confirmed",
      transactionId: typeof obj?.transactionid === "string" ? obj.transactionid : undefined,
      gatewayDetail,
    };
  }

  return {
    success: false,
    code: data.code,
    message: typeof data.message === "string" ? data.message : "Payment not confirmed",
    gatewayDetail,
  };
}

/**
 * Verify webhook authenticity by checking the account secret Moolre includes
 * in the callback body. Compared in constant time.
 *
 * Note: this is Moolre's only callback credential, and it travels inside the
 * payload — so it must never be exposed anywhere else. Combine it with the
 * MOOLRE_WEBHOOK_IPS allow-list and the server-side status re-verification in
 * the webhook handler.
 */
export function verifyWebhookSecret(webhookSecret: string): boolean {
  const { secret } = getConfig();
  if (!secret || !webhookSecret) return false;
  const a = createHash("sha256").update(String(webhookSecret)).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

export type { PaymentParams, PaymentResult };
