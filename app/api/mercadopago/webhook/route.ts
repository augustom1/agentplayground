import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// MercadoPago IPN (Instant Payment Notification) handler
//
// MP sends a POST when payment status changes. We:
//   1. Verify it's a payment topic
//   2. Fetch the payment details from MP API
//   3. Log it to the activity_logs table
//   4. On "approved" — you can trigger user provisioning here
//
// Docs: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/notifications/ipn
// ---------------------------------------------------------------------------

interface MPPayment {
  id: number;
  status: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
  payer?: { email?: string };
  metadata?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const topic = params.get("topic") ?? params.get("type");
  const resourceId = params.get("id") ?? params.get("data.id");

  // MercadoPago also sends a JSON body for newer webhook format
  let body: { type?: string; data?: { id?: string } } = {};
  try { body = await req.json(); } catch { /* old IPN format has no body */ }

  const paymentId = resourceId ?? body?.data?.id;
  const eventType = topic ?? body?.type;

  // We only care about payment events
  if (eventType !== "payment" || !paymentId) {
    return NextResponse.json({ received: true });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("[MP webhook] MERCADOPAGO_ACCESS_TOKEN not set");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  // Fetch payment details from MP
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mpRes.ok) {
    console.error("[MP webhook] Could not fetch payment", paymentId, await mpRes.text());
    return NextResponse.json({ error: "mp_fetch_failed" }, { status: 500 });
  }

  const payment = await mpRes.json() as MPPayment;

  console.log("[MP webhook] Payment received:", {
    id: payment.id,
    status: payment.status,
    ref: payment.external_reference,
    amount: `${payment.transaction_amount} ${payment.currency_id}`,
    email: payment.payer?.email,
  });

  // Log to activity_logs so it appears in the dashboard
  try {
    await prisma.activityLog.create({
      data: {
        action: `MercadoPago payment ${payment.status}: ${payment.external_reference} — ${payment.transaction_amount} ${payment.currency_id} (${payment.payer?.email ?? "unknown"})`,
        type: payment.status === "approved" ? "success" : "info",
        teamId: null,
      },
    });
  } catch (err) {
    // Non-fatal — log but don't fail the webhook
    console.error("[MP webhook] Could not write activity log:", err);
  }

  // TODO: on payment.status === "approved":
  //   - Send a confirmation email to payment.payer.email
  //   - Create a ticket / notify the admin via Telegram or email
  //   - Provision user access if applicable

  return NextResponse.json({ received: true, status: payment.status });
}
