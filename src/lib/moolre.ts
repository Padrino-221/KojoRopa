const MOOLRE_BASE = process.env.MOOLRE_BASE_URL || "https://sandbox.moolre.com";

function getConfig() {
  const user = process.env.MOOLRE_API_USER;
  const pubKey = process.env.MOOLRE_PUB_KEY;
  const accountId = process.env.MOOLRE_ACCOUNT_ID;
  const secret = process.env.MOOLRE_SECRET;

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
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233")) return "0" + digits.slice(3);
  if (digits.startsWith("0")) return digits;
  return "0" + digits;
}

/**
 * Initiate a Mobile Money payment via Moolre.
 * Sends a USSD prompt to the customer's phone.
 */
export async function initiatePayment(params: PaymentParams): Promise<PaymentResult> {
  const { user, pubKey, accountId } = getConfig();

  const phone = normalizePhone(params.phone);

  const body = {
    type: 1,
    channel: "13", // MTN Mobile Money
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
    console.error("[moolre] fetch error:", err);
    return {
      success: false,
      message: `Network error: ${String(err)}`,
    };
  }

  const text = await res.text();
  console.log(`[moolre] initiatePayment raw response (HTTP ${res.status}): ${text}`);
  let data: MoolreResponse;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("[moolre] non-JSON response:", text);
    return {
      success: false,
      message: `Unexpected response from Moolre: ${text.slice(0, 200)}`,
    };
  }

  if (data.status === 1) {
    // data is a plain string transaction reference (UUID), not an object
    const ref = typeof data.data === "string" ? data.data : "";
    const requiresOtp = data.code === "TP14";
    console.log("[moolre] initiatePayment success:", { code: data.code, ref });
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment initiated",
      transactionId: ref || undefined,
      sessionId: ref || undefined,
      requiresOtp,
    };
  }

  console.log("[moolre] initiatePayment failed:", { status: data.status, code: data.code, message: data.message, fullData: data });
  return {
    success: false,
    code: data.code,
    message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment failed",
    requiresOtp: data.code === "TP14",
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

  const body = {
    type: 1,
    channel: "13",
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
    console.error("[moolre] submitOtp fetch error:", err);
    return {
      success: false,
      message: `Network error: ${String(err)}`,
    };
  }

  const text = await res.text();
  let data: MoolreResponse;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("[moolre] submitOtp non-JSON response:", text);
    return {
      success: false,
      message: `Unexpected response: ${text.slice(0, 200)}`,
    };
  }

  if (data.status === 1) {
    const ref = typeof data.data === "string" ? data.data : "";
    console.log("[moolre] submitOtp success:", { code: data.code, ref });
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
    console.error("[moolre] checkStatus fetch error:", err);
    return { success: false, message: `Network error: ${String(err)}` };
  }

  const text = await res.text();
  let data: MoolreResponse;
  try {
    data = JSON.parse(text);
  } catch {
    return { success: false, message: "Invalid response" };
  }

  if (data.status === 1) {
    const obj = typeof data.data === "object" && data.data !== null ? data.data as Record<string, unknown> : null;
    const paid = String(obj?.txstatus) === "1";
    console.log("[moolre] checkPaymentStatus:", { code: data.code, paid, data: data.data });
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
 * Verify webhook authenticity by checking the secret field.
 */
export function verifyWebhookSecret(webhookSecret: string): boolean {
  const { secret } = getConfig();
  if (!secret) return false;
  return webhookSecret === secret;
}

export type { PaymentParams, PaymentResult };
