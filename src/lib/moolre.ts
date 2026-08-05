const MOOLRE_BASE = "https://api.moolre.com";

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

  const res = await fetch(`${MOOLRE_BASE}/open/transact/payment`, {
    method: "POST",
    headers: {
      "X-API-USER": user,
      "X-API-PUBKEY": pubKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data: MoolreResponse = await res.json();

  if (data.status === 1) {
    return {
      success: true,
      code: data.code,
      message: typeof data.message === "string" ? data.message : Array.isArray(data.message) ? data.message.join(", ") : "Payment initiated",
      transactionId: typeof data.data === "object" && data.data !== null ? (data.data as Record<string, unknown>).transactionid as string : undefined,
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
 * Verify webhook authenticity by checking the secret field.
 */
export function verifyWebhookSecret(webhookSecret: string): boolean {
  const { secret } = getConfig();
  if (!secret) return false;
  return webhookSecret === secret;
}

export type { PaymentParams, PaymentResult };
