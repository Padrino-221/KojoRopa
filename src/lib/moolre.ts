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

/**
 * Initiate a Mobile Money payment via Moolre.
 * Sends a USSD prompt to the customer's phone.
 */
export async function initiatePayment(params: PaymentParams): Promise<PaymentResult> {
  const { user, pubKey, accountId } = getConfig();

  const phone = params.phone.replace(/\s/g, "").replace(/^0/, "233");

  const body = {
    type: 1,
    channel: 13, // MTN Mobile Money
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
    const dataObj = typeof data.data === "object" && data.data !== null ? data.data as Record<string, unknown> : null;
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment initiated",
      transactionId: dataObj?.transactionid as string | undefined,
      sessionId: dataObj?.sessionid as string | undefined,
    };
  }

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

  const phone = params.phone.replace(/\s/g, "").replace(/^0/, "233");

  const body = {
    type: 1,
    channel: 13,
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
    const dataObj = typeof data.data === "object" && data.data !== null ? data.data as Record<string, unknown> : null;
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment confirmed",
      transactionId: dataObj?.transactionid as string | undefined,
    };
  }

  return {
    success: false,
    code: data.code,
    message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "OTP verification failed",
  };
}

/**
 * Check payment status via Moolre.
 */
export async function checkPaymentStatus(params: {
  transactionId: string;
}): Promise<PaymentResult> {
  const { user, pubKey } = getConfig();

  let res: Response;
  try {
    res = await fetch(`${MOOLRE_BASE}/open/transact/status`, {
      method: "POST",
      headers: {
        "X-API-USER": user,
        "X-API-PUBKEY": pubKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transactionid: params.transactionId }),
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
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : "Payment successful",
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
