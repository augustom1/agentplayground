/**
 * Telegram Bot Bridge — full implementation
 *
 * Setup:
 * 1. Create a bot with @BotFather → get TELEGRAM_BOT_TOKEN
 * 2. Generate a webhook secret: openssl rand -hex 20
 * 3. Register the webhook:
 *    curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *      -d "url=https://app.DOMAIN/api/telegram/webhook?secret_token=<SECRET>" \
 *      -d "allowed_updates=[\"message\"]"
 * 4. Add to .env.local: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
 *
 * Supports: text, voice notes, audio files, photos, documents, memory per chat
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { CHAT_TOOLS, executeTool } from "@/lib/chat-tools";
import { downloadTelegramFile, transcribeAudio } from "./audio";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; username?: string; language_code?: string };
    chat: { id: number; type: string };
    text?: string;
    caption?: string;
    date: number;
    voice?: {
      file_id: string;
      file_unique_id: string;
      duration: number;
      mime_type?: string;
      file_size?: number;
    };
    audio?: {
      file_id: string;
      duration: number;
      mime_type?: string;
      file_name?: string;
    };
    document?: {
      file_id: string;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
    photo?: Array<{
      file_id: string;
      file_unique_id: string;
      width: number;
      height: number;
      file_size?: number;
    }>;
  };
}

// ─── Telegram API helpers ──────────────────────────────────────────────────────

/** Send a text message to a Telegram chat */
export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const truncated = text.length > 4000 ? text.slice(0, 3997) + "…" : text;

  const send = async (parseMode?: string) => {
    const body: Record<string, unknown> = { chat_id: chatId, text: truncated };
    if (parseMode) body.parse_mode = parseMode;
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  };

  const ok = await send("Markdown");
  if (!ok) await send();
}

/** Show "typing…" indicator in Telegram chat */
async function sendTypingAction(chatId: number): Promise<void> {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {});
}

// ─── Conversation memory ───────────────────────────────────────────────────────

async function getOrCreateConversation(telegramChatId: number): Promise<string> {
  const title = `telegram:${telegramChatId}`;
  const existing = await prisma.chatConversation.findFirst({
    where: { title },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) return existing.id;

  const conv = await prisma.chatConversation.create({ data: { title } });
  return conv.id;
}

async function getConversationHistory(
  conversationId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  return messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
}

async function saveToConversation(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await prisma.chatMessage.create({ data: { conversationId, role, content } });
}

// ─── Core response function ────────────────────────────────────────────────────

/** Get a Keeper response with conversation memory */
export async function getKeeperResponse(
  userMessage: string,
  telegramChatId: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "⚠️ ANTHROPIC_API_KEY is not configured.";

  // Load context + conversation history in parallel
  const [teams, projects, conversationId] = await Promise.all([
    prisma.agentTeam.findMany({
      where: { isSystemTeam: false },
      select: { id: true, name: true, status: true },
      take: 10,
    }),
    prisma.project.findMany({
      where: { status: { not: "archived" } },
      select: { id: true, name: true, status: true, type: true },
      take: 5,
    }),
    getOrCreateConversation(telegramChatId),
  ]);

  const history = await getConversationHistory(conversationId);

  const teamSummary =
    teams.length > 0
      ? teams.map((t) => `- ${t.name} [${t.status}] ID:${t.id}`).join("\n")
      : "No teams yet.";

  const projectSummary =
    projects.length > 0
      ? projects.map((p) => `- ${p.name} [${p.status}] ID:${p.id}`).join("\n")
      : "No active projects.";

  const systemPrompt = `You are the Playground Keeper responding via Telegram. Be concise — Telegram has a 4096 char limit. Keep responses under 500 words. Use plain text; minimal markdown (*bold* is OK).

## Active Projects
${projectSummary}

## Agent Teams
${teamSummary}

You can create teams, projects, delegate tasks, and search the web. Use your tools when needed.`;

  const client = new Anthropic({ apiKey });
  const tools = CHAT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  let messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    ...history,
    { role: "user", content: userMessage },
  ];

  let result = "";
  let iterations = 0;

  while (iterations < 5) {
    iterations++;
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages as Parameters<typeof client.messages.create>[0]["messages"],
      tools: tools as Anthropic.Messages.Tool[],
    });

    let hasToolUse = false;
    for (const block of response.content) {
      if (block.type === "text") {
        result += block.text;
      } else if (block.type === "tool_use") {
        hasToolUse = true;
        const toolResult = await executeTool(block.name, block.input as Record<string, unknown>);
        messages = [
          ...messages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [{ type: "tool_result", tool_use_id: block.id, content: toolResult }],
          },
        ];
      }
    }

    if (!hasToolUse || response.stop_reason === "end_turn") break;
  }

  const finalResult = result || "I processed your request.";

  // Save exchange to memory (fire-and-forget)
  saveToConversation(conversationId, "user", userMessage).catch(() => {});
  saveToConversation(conversationId, "assistant", finalResult).catch(() => {});

  return finalResult;
}

// ─── Document text extraction (inline — avoids HTTP round-trip) ─────────────

async function extractDocumentText(fileId: string, filename: string, mimeType?: string): Promise<string> {
  const buffer = await downloadTelegramFile(fileId);

  const isPDF = mimeType === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
  const isText = !isPDF && (
    (mimeType?.startsWith("text/") ?? false) ||
    /\.(txt|md|csv|json|ts|tsx|js|py|sh|yaml|yml)$/i.test(filename)
  );

  if (isPDF) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text.slice(0, 30000);
    } catch {
      return "[Could not extract PDF text]";
    }
  }

  if (isText) {
    return buffer.toString("utf-8").slice(0, 30000);
  }

  return `[File received: ${filename}]`;
}

// ─── Main update processor ─────────────────────────────────────────────────────

/** Process a Telegram update and send a reply */
export async function processUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg?.chat) return;

  const chatId = msg.chat.id;

  try {
    // Show typing indicator immediately
    await sendTypingAction(chatId);

    let userMessage: string;

    if (msg.voice) {
      const transcript = await transcribeAudio(msg.voice.file_id, msg.voice.duration);
      userMessage = `[Voice note — ${msg.voice.duration}s]: "${transcript}"`;

    } else if (msg.audio) {
      const transcript = await transcribeAudio(msg.audio.file_id, msg.audio.duration);
      userMessage = `[Audio file: ${msg.audio.file_name ?? "audio"} — ${msg.audio.duration}s]: "${transcript}"`;

    } else if (msg.photo) {
      // Get largest photo variant, download, send as vision message
      const photo = msg.photo[msg.photo.length - 1];
      const photoBuffer = await downloadTelegramFile(photo.file_id);
      const base64 = photoBuffer.toString("base64");
      const caption = msg.caption ?? "What is in this image?";

      // Build a vision-capable message directly to Anthropic
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        await sendTelegramMessage(chatId, "⚠️ ANTHROPIC_API_KEY is not configured.");
        return;
      }

      const conversationId = await getOrCreateConversation(chatId);
      const history = await getConversationHistory(conversationId);
      const client = new Anthropic({ apiKey });

      const visionMessages: Parameters<typeof client.messages.create>[0]["messages"] = [
        ...history.map((h) => ({ role: h.role, content: h.content })),
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
            { type: "text", text: caption },
          ],
        },
      ];

      const res = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: "You are the Playground Keeper. The user sent a photo via Telegram. Be concise (under 500 words).",
        messages: visionMessages,
      });

      const answer = res.content.filter((b) => b.type === "text").map((b) => (b as { type: "text"; text: string }).text).join("");
      saveToConversation(conversationId, "user", `[Photo] ${caption}`).catch(() => {});
      saveToConversation(conversationId, "assistant", answer).catch(() => {});
      await sendTelegramMessage(chatId, answer || "I see your photo.");
      return;

    } else if (msg.document) {
      const filename = msg.document.file_name ?? "document";
      const extractedText = await extractDocumentText(msg.document.file_id, filename, msg.document.mime_type);
      const caption = msg.caption ?? "Please process this document.";
      userMessage = `[Document: ${filename}]\n\n${extractedText}\n\nUser note: "${caption}"`;

    } else if (msg.text) {
      userMessage = msg.text;

    } else {
      await sendTelegramMessage(chatId, "I can handle text, voice notes, photos, and documents. Send me a message!");
      return;
    }

    const response = await getKeeperResponse(userMessage, chatId);
    await sendTelegramMessage(chatId, response);

  } catch (err) {
    console.error("[telegram] Error processing update:", err);
    await sendTelegramMessage(chatId, "⚠️ Something went wrong. Please try again.");
  }
}
