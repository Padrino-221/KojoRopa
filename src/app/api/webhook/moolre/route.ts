import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookSecret } from "@/lib/moolre";
import { logAudit } from "@/lib/audit";

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

export async function POST(req: Request) {
  try {
    const payload: MoolreWebhookPayload = await req.json();
    const { data } = payload;

    // Verify webhook authenticity
    if (!verifyWebhookSecret(data.secret)) {
      await logAudit("webhook.moolre", "invalid secret", undefined);
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    const externalRef = data.externalref;
    const txStatus = data.txstatus; // 1 = success, 0 = pending, 2 = failed

    // Find order by ID (externalref is the order ID)
    const order = await prisma.order.findUnique({
      where: { id: externalRef },
    });

    if (!order) {
      await logAudit("webhook.moolre", `order not found: ${externalRef}`, undefined);
      return NextResponse.json({ received: true });
    }

    // Update order status based on payment result
    let newStatus: string;
    if (txStatus === 1) {
      newStatus = "delivered";
    } else if (txStatus === 2) {
      newStatus = "failed";
    } else {
      // Still pending, don't update
      return NextResponse.json({ received: true });
    }

    await prisma.order.update({
      where: { id: externalRef },
      data: { status: newStatus },
    });

    await logAudit(
      "webhook.moolre",
      `order ${externalRef} → ${newStatus} (tx: ${data.transactionid})`,
      undefined
    );

    return NextResponse.json({ received: true });
  } catch (error) {
    await logAudit("webhook.moolre", `error: ${String(error)}`, undefined);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
