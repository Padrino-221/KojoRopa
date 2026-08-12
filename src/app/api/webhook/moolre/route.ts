import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  verifyWebhookSecret,
  checkPaymentStatus,
  normalizePhone,
} from "@/lib/moolre";
import { logAudit } from "@/lib/audit";
import { confirmOrderPayment } from "@/lib/order";

interface MoolreWebhookPayload {
  status: number;
  code: string;
  message: string;
  data: {
    txstatus: number;
    payer: string;
    accountnumber: string;
    name: string;
    amount: string;
    value: string;
    transactionid: string;
    externalref: string;
    thirdpartyref: string;
    secret: string;
    ts: string;
  };
}

/**
 * Moolre callback IP allow-list (comma-separated). Moolre does not provide
 * HMAC signatures, so its documented guidance is HTTPS + IP allow-listing +
 * reference matching + server-side status re-verification. When this env var
 * is set, webhooks from any other IP are rejected outright.
 *
 *   MOOLRE_WEBHOOK_IPS="192.241.135.134,174.138.44.22"
 *   (wallet callbacks 192.241.135.134 · POS callbacks 174.138.44.22)
 */
const WEBHOOK_ALLOWLIST = (process.env.MOOLRE_WEBHOOK_IPS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function clientIp(req: Request): string | null {
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim().split(",")[0].trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return null;
}

export async function POST(req: Request) {
  try {
    // 1. IP allow-list (only enforced when configured)
    if (WEBHOOK_ALLOWLIST.length > 0) {
      const ip = clientIp(req);
      if (!ip || !WEBHOOK_ALLOWLIST.includes(ip)) {
        await logAudit("webhook.moolre", `rejected callback from ${ip ?? "unknown"} (not in allow-list)`, ip ?? undefined);
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const payload: MoolreWebhookPayload = await req.json();
    const data = payload?.data;
    if (!data || typeof data !== "object") {
      await logAudit("webhook.moolre", "malformed callback payload", undefined);
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }

    // 2. Authenticate — constant-time comparison of the account secret Moolre
    //    includes in the callback body.
    if (!verifyWebhookSecret(data.secret)) {
      await logAudit("webhook.moolre", "invalid secret", undefined);
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const externalRef = typeof data.externalref === "string" ? data.externalref : "";
    const txStatus = Number(data.txstatus); // 1 = success, 0 = pending, 2 = failed
    const txId = typeof data.transactionid === "string" ? data.transactionid : "";

    if (!externalRef) {
      await logAudit("webhook.moolre", "missing externalref", undefined);
      return NextResponse.json({ error: "Missing externalref" }, { status: 400 });
    }

    // 3. Find the order (externalref is the order id)
    const order = await prisma.order.findUnique({
      where: { id: externalRef },
    });

    if (!order) {
      await logAudit("webhook.moolre", `order not found: ${externalRef}`, undefined);
      return NextResponse.json({ received: true });
    }

    // 4. Replay protection — never re-process events for an order we've
    //    already confirmed, and never let a late/failure event flip a paid or
    //    delivered order back.
    if (order.status === "paid" || order.status === "delivered") {
      return NextResponse.json({ received: true });
    }
    if (txStatus === 2 && order.status !== "pending") {
      return NextResponse.json({ received: true });
    }

    if (txStatus === 1) {
      if (!txId) {
        await logAudit("webhook.moolre", `order ${externalRef}: success callback missing transactionid — not confirmed`, undefined);
        return NextResponse.json({ received: true });
      }

      // 5a. Amount integrity — the callback amount must equal what the order
      //     was created for. Never confirm a payment for a different amount.
      const eventAmount = Number(data.amount);
      if (!Number.isFinite(eventAmount) || eventAmount !== order.total) {
        await logAudit(
          "webhook.moolre",
          `order ${externalRef}: amount mismatch — callback ${data.amount} vs expected ${order.total}; payment NOT confirmed`,
          undefined
        );
        return NextResponse.json({ received: true });
      }

      // 5b. Payer integrity — the phone that paid should be the order's phone.
      if (order.phone) {
        const eventPayer = typeof data.payer === "string" ? data.payer.trim() : "";
        if (!eventPayer || normalizePhone(eventPayer) !== normalizePhone(order.phone)) {
          await logAudit(
            "webhook.moolre",
            `order ${externalRef}: payer mismatch — callback ${eventPayer || "(missing)"}; payment NOT confirmed`,
            undefined
          );
          return NextResponse.json({ received: true });
        }
      }

      // 6. Server-to-server re-verification — ask Moolre directly whether this
      //     transaction is really paid before marking the order paid. This is
      //     the strongest guard: even a forged or replayed callback can't
      //     confirm an order Moolre says isn't paid.
      const verification = await checkPaymentStatus({ externalRef });
      if (!verification.success) {
        await logAudit(
          "webhook.moolre",
          `order ${externalRef}: re-verification with Moolre did not confirm payment (${verification.code || "unknown"}) — NOT confirmed`,
          undefined
        );
        return NextResponse.json({ received: true });
      }

      await confirmOrderPayment(externalRef, { transactionId: txId });
      await logAudit(
        "webhook.moolre",
        `order ${externalRef} payment confirmed via callback (tx: ${txId})`,
        undefined
      );
      return NextResponse.json({ received: true });
    }

    if (txStatus === 2) {
      await prisma.order.update({
        where: { id: externalRef },
        data: { status: "failed" },
      });
      await logAudit(
        "webhook.moolre",
        `order ${externalRef} → failed (tx: ${txId || "unknown"})`,
        undefined
      );
    }

    // txStatus 0 = still pending — nothing to update.
    return NextResponse.json({ received: true });
  } catch (error) {
    await logAudit("webhook.moolre", `error: ${String(error)}`, undefined);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
