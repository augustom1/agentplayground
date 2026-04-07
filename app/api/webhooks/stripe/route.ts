/**
 * Stripe Webhook Handler
 *
 * Validates Stripe's signature, then on checkout.session.completed
 * adds credits to the user's wallet.
 *
 * Configure in Stripe Dashboard:
 *   Endpoint URL: https://app.DOMAIN/api/webhooks/stripe
 *   Events to send: checkout.session.completed
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { addCredits } from "@/lib/usage-tracker";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  return new Stripe(key, { apiVersion: "2025-06-30.basil" });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new NextResponse(`Webhook verification failed: ${String(err)}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const creditsStr = session.metadata?.credits;
    const packageId = session.metadata?.packageId;

    if (!userId || !creditsStr) {
      console.error("[stripe-webhook] Missing metadata in session:", session.id);
      return new NextResponse("Missing metadata", { status: 400 });
    }

    const credits = parseInt(creditsStr, 10);
    if (isNaN(credits) || credits <= 0) {
      console.error("[stripe-webhook] Invalid credits value:", creditsStr);
      return new NextResponse("Invalid credits", { status: 400 });
    }

    try {
      const newBalance = await addCredits(userId, credits, "purchase");
      console.log(`[stripe-webhook] Added ${credits} credits to user ${userId}. New balance: ${newBalance}. Package: ${packageId}`);
    } catch (err) {
      console.error("[stripe-webhook] Failed to add credits:", err);
      return new NextResponse("Failed to update credits", { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
