import { Resend } from "resend";
import { formatPrice } from "@/lib/format";

/**
 * Transactional email helpers powered by Resend (https://resend.com).
 *
 * Emails are fire-and-forget by design: every send is wrapped in try/catch so a
 * mail failure can never break the checkout or admin flows. Set these env vars:
 *
 *   RESEND_API_KEY        — required; from https://resend.com/api-keys
 *   RESEND_FROM           — optional; defaults to Kojosropa <orders@kojosropa.com>
 *   ADMIN_NOTIFY_EMAIL    — optional; who gets new-order notifications.
 *                           If unset, admin notifications are skipped.
 */

let _resend: Resend | null = null;
function getResend(): Resend {
  // Lazy init so a missing key at module load can never throw.
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export const RESEND_FROM =
  process.env.RESEND_FROM ?? "Kojosropa <orders@kojosropa.com>";

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL?.trim() || "";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kojo-ropa-nu.vercel.app";

export interface EmailOrderLine {
  name: string;
  size: string;
  qty: number;
  price: number;
}

export interface EmailOrder {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subtotal: number;
  shipping: number;
  total: number;
  street: string;
  city: string;
  postal: string;
  country: string;
  token?: string | null;
  items: EmailOrderLine[];
}

/* ——— escaping ——— */

/** HTML-escape user-controlled values before interpolating into email markup. */
function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ——— shared HTML shell ——— */

function layout(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Kojosropa</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f5f5;">
    <span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;overflow:hidden;">
            <!-- header -->
            <tr>
              <td style="background:#111111;padding:28px 32px;text-align:center;">
                <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:0.02em;color:#ffffff;">
                  <span style="color:#c8102e;font-weight:700;">KOJOS</span>ROPA
                </p>
                <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#8a8a8a;">Curated shirts · one of one</p>
              </td>
            </tr>
            <!-- body -->
            <tr>
              <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#111111;">
                ${body}
              </td>
            </tr>
            <!-- footer -->
            <tr>
              <td style="border-top:1px solid #e5e5e5;padding:24px 32px;background:#ffffff;">
                <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:#8a8a8a;">
                  Kojosropa · Accra, Ghana<br />
                  <span style="color:#c8102e;">@kojosropa</span> · Kojosropa on Facebook, TikTok &amp; Snapchat · WhatsApp 020 940 1655
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function orderItemsHtml(order: EmailOrder): string {
  const rows = order.items
    .map(
      (line) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111111;">${esc(line.name)}<br /><span style="font-size:12px;color:#8a8a8a;">Size ${esc(line.size)} · qty ${line.qty}</span></td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#111111;white-space:nowrap;">${formatPrice(line.price * line.qty)}</td>
      </tr>`
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rows}
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#525252;">Subtotal</td>
        <td align="right" style="padding:10px 0;font-size:13px;color:#525252;">${formatPrice(order.subtotal)}</td>
      </tr>
      ${
        order.shipping > 0
          ? `<tr>
        <td style="padding:6px 0;font-size:13px;color:#525252;">Shipping</td>
        <td align="right" style="padding:6px 0;font-size:13px;color:#525252;">${formatPrice(order.shipping)}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding:12px 0 0;border-top:1px solid #e5e5e5;font-size:15px;font-weight:700;color:#111111;">Total paid</td>
        <td align="right" style="padding:12px 0 0;border-top:1px solid #e5e5e5;font-size:18px;font-weight:700;color:#c8102e;white-space:nowrap;">${formatPrice(order.total)}</td>
      </tr>
    </table>`;
}

function receiptLink(order: EmailOrder): string | null {
  if (!order.token) return null;
  return `${SITE_URL}/confirmation?token=${encodeURIComponent(order.token)}`;
}

function buttonHtml(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 0;">
    <tr>
      <td style="border-radius:999px;background:#c8102e;">
        <a href="${href}" style="display:inline-block;padding:13px 34px;border-radius:999px;background:#c8102e;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;text-decoration:none;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/* ——— actual sends ——— */

async function send(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY is not set — skipping email to", to);
    return false;
  }
  try {
    const { error } = await getResend().emails.send({ from: RESEND_FROM, to, subject, html });
    if (error) {
      console.error("[email] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send failed:", err);
    return false;
  }
}

/** Customer receipt email — sent once the Moolre payment is confirmed. */
export async function sendOrderConfirmation(order: EmailOrder): Promise<boolean> {
  const link = receiptLink(order);
  const body = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hi ${esc(order.name.split(" ")[0] || "there")},</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#525252;">Payment confirmed — your pieces are being wrapped in tissue as we speak. Here's your receipt for <strong style="color:#111111;">order ${order.id}</strong>:</p>
    ${orderItemsHtml(order)}
    ${
      link
        ? buttonHtml(link, "View your receipt")
        : ""
    }
    <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#8a8a8a;">Questions? Message us on WhatsApp at 020 940 1655.</p>`;

  const ok = await send(
    order.email,
    `Your Kojosropa order ${order.id} is confirmed`,
    layout("Payment confirmed for order " + order.id, body)
  );
  return ok;
}

/** Internal notification to the shop owner when an order is paid. */
export async function sendAdminOrderNotification(
  order: EmailOrder
): Promise<boolean> {
  if (!ADMIN_NOTIFY_EMAIL) return false;
  const link = receiptLink(order);
  const body = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">New paid order — <strong style="color:#c8102e;">${order.id}</strong>.</p>
    ${orderItemsHtml(order)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#f5f5f5;border-radius:12px;">
      <tr>
        <td style="padding:16px;font-size:13px;line-height:1.7;color:#525252;">
          <strong style="color:#111111;">Ship to</strong><br />
          ${esc(order.name)} · ${esc(order.phone) || "no phone"}<br />
          ${esc(order.street)}, ${order.postal ? `${esc(order.postal)}, ` : ""}${esc(order.city)}, ${esc(order.country)}<br />
          Buyer email: ${esc(order.email)}
        </td>
      </tr>
    </table>
    ${
      link
        ? buttonHtml(link, "Open order receipt")
        : ""
    }`;

  return send(
    ADMIN_NOTIFY_EMAIL,
    `🧾 New paid order ${order.id} — ${formatPrice(order.total)}`,
    layout(`New paid order ${order.id}`, body)
  );
}

/** Customer update when the admin marks an order as delivered. */
export async function sendDeliveryUpdate(order: EmailOrder): Promise<boolean> {
  const link = receiptLink(order);
  const body = `
    <p style="margin:0 0 18px;font-size:15px;line-height:1.7;">Hi ${esc(order.name.split(" ")[0] || "there")},</p>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#525252;">Good news — your order <strong style="color:#111111;">${order.id}</strong> has been marked <strong style="color:#c8102e;">delivered</strong>. Wear it well.</p>
    ${orderItemsHtml(order)}
    ${
      link
        ? buttonHtml(link, "View your order")
        : ""
    }
    <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:#8a8a8a;">Thanks for shopping with Kojosropa — one of one, no restocks.</p>`;

  return send(
    order.email,
    `Your Kojosropa order ${order.id} has been delivered`,
    layout("Order " + order.id + " delivered", body)
  );
}
