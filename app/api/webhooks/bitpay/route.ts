export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { addCredits } from "@/lib/usage-tracker";

async function verifyBitPayInvoice(invoiceId: string): Promise<boolean> {
  if (!process.env.BITPAY_API_KEY) return false;
  try {
    const res = await fetch(`https://bitpay.com/invoices/${invoiceId}`, {
      headers: {
        Authorization: `Token ${process.env.BITPAY_API_KEY}`,
        "X-Accept-Version": "2.0.0",
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return ["complete", "confirmed"].includes(data.data?.status ?? "");
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!process.env.BITPAY_API_KEY) {
    return new NextResponse("BitPay not configured", { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const event = body.event as { name?: string; data?: Record<string, unknown> } | undefined;
  if (!event?.name || !["invoice_completed", "invoice_confirmed"].includes(event.name)) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const invoiceId = event.data?.id as string | undefined;
  const posDataRaw = event.data?.posData as string | undefined;

  if (!invoiceId || !posDataRaw) {
    return new NextResponse("Missing invoice data", { status: 400 });
  }

  // Verify the invoice is actually paid before crediting
  const verified = await verifyBitPayInvoice(invoiceId);
  if (!verified) {
    console.warn(`[bitpay-webhook] Invoice ${invoiceId} not verified as paid`);
    return NextResponse.json({ received: true, verified: false });
  }

  let posData: { userId?: string; credits?: number; packageId?: string };
  try {
    posData = JSON.parse(posDataRaw);
  } catch {
    return new NextResponse("Invalid posData", { status: 400 });
  }

  const { userId, credits } = posData;
  if (!userId || !credits || credits <= 0) {
    return new NextResponse("Invalid posData fields", { status: 400 });
  }

  try {
    const newBalance = await addCredits(userId, credits, "purchase");
    console.log(`[bitpay-webhook] Added ${credits} credits to ${userId}. Balance: ${newBalance}`);
  } catch (err) {
    console.error("[bitpay-webhook] Failed to add credits:", err);
    return new NextResponse("Failed to update credits", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
