export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";
import { CREDIT_PACKAGES } from "@/lib/pricing";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2025-06-30.basil" });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let packageId: string;
  let successUrl: string;
  let cancelUrl: string;

  try {
    const body = await req.json();
    packageId = body.packageId;
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    successUrl = body.successUrl || `${appUrl}/billing?success=1`;
    cancelUrl = body.cancelUrl || `${appUrl}/billing?cancelled=1`;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: `Unknown package: ${packageId}` }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(pkg.usd * 100), // cents
            product_data: {
              name: `${pkg.label} — ${pkg.credits.toLocaleString()} credits`,
              description: `Agent Playground credit top-up. Credits never expire.`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        packageId: pkg.id,
        credits: pkg.credits.toString(),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment." }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
