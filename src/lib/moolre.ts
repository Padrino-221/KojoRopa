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

  if (Number(data.status) === 1) {
    // data is a plain string transaction reference (UUID), not an object
    const ref = typeof data.data === "string" ? data.data : "";
    const requiresOtp = data.code === "TP14";
    console.log("[moolre] initiatePayment success:", { code: data.code, requiresOtp });
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment initiated",
      transactionId: ref || undefined,
      sessionId: ref || undefined,
      requiresOtp,
    };
  }

  // Moolre returns status !== 1 on the first call when OTP is required (e.g.
  // code "TP14"). The charge has NOT been made yet but the OTP was dispatched
  // and a session ID is present in data.data. We must treat this as a
  // successful initiation (requiresOtp: true) and capture the session ID so
  // the subsequent OTP submit can include it — without it Moolre rejects the
  // charge with sessionid: "".
  if (data.code === "TP14") {
    const ref = typeof data.data === "string" ? data.data : "";
    console.log("[moolre] initiatePayment OTP required:", { code: data.code, sessionId: ref || "(none)" });
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "OTP sent to your phone",
      transactionId: ref || undefined,
      sessionId: ref || undefined,
      requiresOtp: true,
    };
  }

  console.log("[moolre] initiatePayment failed:", { status: data.status, code: data.code });
  return {
    success: false,
    code: data.code,
    message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment failed",
    requiresOtp: false,
  };
}

/**
 * Submit OTP code for a Moolre payment.
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

  const body = {
    type: 1,
    channel,
    currency: "GHS",
    payer: phone,
    amount: params.amount.toFixed(2),
    externalref: params.externalRef,
    reference: `Order ${params.externalRef}`,
    otpcode: params.otpCode,
    sessionid: params.sessionId,
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
    console.error("[moolre] submitOtp fetch error:", String(err));
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
    console.error("[moolre] submitOtp non-JSON response");
    return { success: false, message: "Unexpected response from the payment provider." };
  }

  if (Number(data.status) === 1) {
    const ref = typeof data.data === "string" ? data.data : "";
    console.log("[moolre] submitOtp success:", { code: data.code });
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment confirmed",
      transactionId: ref || undefined,
    };
  }

  return {
    success: false,
    code: data.code,
    message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "OTP verification failed",
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

  if (Number(data.status) === 1) {
    const obj = typeof data.data === "object" && data.data !== null ? data.data as Record<string, unknown> : null;
    const paid = String(obj?.txstatus) === "1";
    console.log("[moolre] checkPaymentStatus:", { code: data.code, paid });
    return {
      success: paid,
      code: data.code,
      message: typeof data.message === "string" ? data.message : paid ? "Payment successful" : "Payment not yet confirmed",
      transactionId: typeof obj?.transactionid === "string" ? obj.transactionid : undefined,
    };
  }

  return {
    success: false,
    code: data.code,
    message: typeof data.message === "string" ? data.message : "Payment not confirmed",
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
