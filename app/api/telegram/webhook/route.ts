export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/integrations/telegram/bot";

export async function GET() {
  const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  return NextResponse.json({ ok: true, configured, service: "telegram-webhook" });
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret_token");

  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return new NextResponse("TELEGRAM_BOT_TOKEN not configured", { status: 503 });
  }

  let update: TelegramUpdate;
  try {
    update = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Process async — Telegram requires a fast 200 response
  import("@/lib/integrations/telegram/bot")
    .then(({ processUpdate }) => processUpdate(update))
    .catch((err) => console.error("[telegram-webhook]", err));

  return NextResponse.json({ ok: true });
}
