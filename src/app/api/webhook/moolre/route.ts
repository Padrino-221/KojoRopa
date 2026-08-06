import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifyWebhookSecret } from "@/lib/moolre";
import { logAudit } from "@/lib/audit";
import { markOrderProductsSold } from "@/lib/order";

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

    // Payment events never mark an order "delivered" — that status is reserved
    // for the admin marking an order as fulfilled. A successful payment keeps
    // the order "pending"; only a failed payment flips it to "failed".
    // On success, the one-of-one pieces in the order are retired from the rack.
    if (txStatus === 1) {
      await prisma.order.update({
        where: { id: externalRef },
        data: {
          moolreTransactionId: data.transactionid || undefined,
        },
      });

      const retired = await markOrderProductsSold(externalRef, undefined);
      revalidatePath("/", "layout");

      await logAudit(
        "webhook.moolre",
        `order ${externalRef} payment confirmed (tx: ${data.transactionid}) — ${retired} piece(s) retired`,
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
        `order ${externalRef} → failed (tx: ${data.transactionid})`,
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
