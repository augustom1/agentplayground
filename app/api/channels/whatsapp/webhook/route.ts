/**
 * WhatsApp webhook via Twilio.
 * Handles inbound WhatsApp messages (text + audio voice notes + images).
 *
 * Setup:
 * 1. Create Twilio account → twilio.com
 * 2. Console → Messaging → Try it out → WhatsApp sandbox
 * 3. Set webhook: https://app.agentplayground.net/api/channels/whatsapp/webhook
 * 4. Add env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getKeeperResponse } from "@/lib/integrations/telegram/bot";

export async function POST(req: NextRequest) {
  // Twilio sends URL-encoded form data
  const formData = await req.formData();

  const from = formData.get("From") as string; // e.g., "whatsapp:+5491112345678"
  const body = (formData.get("Body") as string) ?? "";
  const mediaUrl = formData.get("MediaUrl0") as string | null;
  const mediaType = formData.get("MediaContentType0") as string | null;
  const numMedia = parseInt((formData.get("NumMedia") as string) ?? "0", 10);

  if (!from) {
    return new NextResponse("", { status: 200 });
  }

  let userMessage = body;

  // Handle audio/voice messages
  if (numMedia > 0 && mediaUrl && mediaType?.startsWith("audio/")) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const authHeader = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64");

        const audioRes = await fetch(mediaUrl, {
          headers: { Authorization: `Basic ${authHeader}` },
        });

        if (audioRes.ok) {
          const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
          const blob = new Blob([audioBuffer], { type: mediaType });
          const form = new FormData();
          form.append("file", blob, "audio.ogg");
          form.append("model", "whisper-1");

          const transcribeRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
          });

          if (transcribeRes.ok) {
            const transcription = (await transcribeRes.json()) as { text?: string };
            userMessage = `[Voice note transcript]: "${transcription.text ?? body}"`;
          }
        }
      } catch (err) {
        console.error("[whatsapp] Audio transcription failed:", err);
        userMessage = body || "[Voice note — could not transcribe]";
      }
    }
  } else if (numMedia > 0 && mediaUrl && mediaType?.startsWith("image/")) {
    userMessage = `[Image attached] ${body}`.trim();
  }

  if (!userMessage.trim()) {
    return new NextResponse("", { status: 200 });
  }

  // Use phone number digits as a stable chat ID
  const phoneDigits = from.replace(/\D/g, "");
  const chatId = stableHash(phoneDigits);

  try {
    const response = await getKeeperResponse(userMessage, chatId);
    await sendWhatsAppMessage(from.replace("whatsapp:", ""), response);
  } catch (err) {
    console.error("[whatsapp] Error processing message:", err);
    await sendWhatsAppMessage(from.replace("whatsapp:", ""), "⚠️ Something went wrong. Please try again.");
  }

  return new NextResponse("", { status: 200 });
}

async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

  if (!accountSid || !authToken) {
    console.error("[whatsapp] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set");
    return;
  }

  // WhatsApp has a 1600 char limit
  const truncated = body.length > 1500 ? body.slice(0, 1497) + "…" : body;

  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

  const params = new URLSearchParams({
    From: from,
    To: toNumber,
    Body: truncated,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[whatsapp] Send failed:", err);
  }
}

function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) & 0x7fffffff;
  }
  return hash || 1;
}
