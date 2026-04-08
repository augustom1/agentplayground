export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CREDIT_PACKAGES } from "@/lib/pricing";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!process.env.BITPAY_API_KEY) {
    return NextResponse.json(
      { error: "BitPay is not configured. Add BITPAY_API_KEY to your environment." },
      { status: 503 }
    );
  }

  let packageId: string;
  try {
    const body = await req.json();
    packageId = body.packageId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return NextResponse.json({ error: `Unknown package: ${packageId}` }, { status: 400 });
  }

  // 10% bonus credits for crypto payment
  const creditsWithBonus = Math.floor(pkg.credits * 1.1);
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const res = await fetch("https://bitpay.com/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Accept-Version": "2.0.0",
        Authorization: `Token ${process.env.BITPAY_API_KEY}`,
      },
      body: JSON.stringify({
        price: pkg.usd,
        currency: "USD",
        orderId: `credits_${session.user.id}_${pkg.id}_${Date.now()}`,
        itemDesc: `${pkg.label} — ${creditsWithBonus.toLocaleString()} credits (+10% crypto bonus)`,
        notificationURL: `${appUrl}/api/webhooks/bitpay`,
        redirectURL: `${appUrl}/billing?success=1&method=crypto`,
        buyer: { email: session.user.email },
        posData: JSON.stringify({
          userId: session.user.id,
          packageId: pkg.id,
          credits: creditsWithBonus,
        }),
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `BitPay error: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ url: data.data?.url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
