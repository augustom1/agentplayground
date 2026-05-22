export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ configured: false });

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await res.json();
    return NextResponse.json({ configured: true, webhook: data.result });
  } catch {
    return NextResponse.json({ configured: true, webhook: null });
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const domain = process.env.NEXTAUTH_URL || (process.env.DOMAIN ? `https://${process.env.DOMAIN}` : null);

  if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not set" }, { status: 400 });
  if (!secret) return NextResponse.json({ error: "TELEGRAM_WEBHOOK_SECRET not set" }, { status: 400 });
  if (!domain) return NextResponse.json({ error: "NEXTAUTH_URL or DOMAIN not set" }, { status: 400 });

  const webhookUrl = `${domain}/api/telegram/webhook?secret_token=${secret}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] }),
    });
    const data = await res.json();
    return NextResponse.json({ ...data, webhookUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
