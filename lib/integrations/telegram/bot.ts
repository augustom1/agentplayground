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
 * Brain commands: /note, /brain, /daily — all other text is saved to vault automatically
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { CHAT_TOOLS, executeTool } from "@/lib/chat-tools";
import { downloadTelegramFile, transcribeAudio } from "./audio";
import { ingestToVault, searchVault, getDailyNotes } from "@/lib/brain";

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

/** Send a task completion or notification to the configured group chat. */
export async function sendGroupNotification(text: string): Promise<void> {
  const groupChatId = process.env.TELEGRAM_GROUP_CHAT_ID;
  if (!groupChatId || !process.env.TELEGRAM_BOT_TOKEN) return;
  const chatId = parseInt(groupChatId, 10);
  if (isNaN(chatId)) return;
  await sendTelegramMessage(chatId, text).catch(() => {});
}

/** Send an alert DM to the bot owner (human checkpoint, blocked task). */
export async function sendOwnerAlert(text: string): Promise<void> {
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!ownerChatId || !process.env.TELEGRAM_BOT_TOKEN) return;
  const chatId = parseInt(ownerChatId, 10);
  if (isNaN(chatId)) return;
  await sendTelegramMessage(chatId, text).catch(() => {});
}

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

// ─── Brain command handlers ────────────────────────────────────────────────────

function makeTitleFromText(text: string): string {
  return text.trim().slice(0, 60).replace(/\s+/g, " ") || "Untitled";
}

async function handleBrainSearch(chatId: number, query: string): Promise<void> {
  const results = await searchVault(query, 3);
  if (results.length === 0) {
    await sendTelegramMessage(chatId, `🔍 No results found for: "${query}"`);
    return;
  }
  const lines = [`🔍 *Brain search:* "${query}"\n`];
  results.forEach((r, i) => {
    const score = r.score != null ? ` _(${(r.score * 100).toFixed(0)}% match)_` : "";
    const preview = r.content.trim().slice(0, 150).replace(/\n+/g, " ");
    lines.push(`${i + 1}. *${r.title}*${score}\n   ${preview}…`);
  });
  await sendTelegramMessage(chatId, lines.join("\n"));
}

async function handleDailyNote(chatId: number): Promise<void> {
  const notes = await getDailyNotes(1);
  if (notes.length === 0) {
    await sendTelegramMessage(chatId, "📅 No daily note for today yet.");
    return;
  }
  const note = notes[0];
  const content = note.content.trim().slice(0, 3500);
  await sendTelegramMessage(chatId, `📅 *${note.title}*\n\n${content}`);
}

async function handleIngest(
  chatId: number,
  text: string,
  tags: string[],
  replyPrefix = "✓ Saved to your brain"
): Promise<void> {
  const title = makeTitleFromText(text);
  await ingestToVault(text, title, tags);
  await sendTelegramMessage(chatId, replyPrefix);
}

// ─── Main update processor ─────────────────────────────────────────────────────

/** Process a Telegram update and send a reply */
export async function processUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg?.chat) return;

  const chatId = msg.chat.id;

  try {
    await sendTypingAction(chatId);

    // ── Text messages ──────────────────────────────────────────────────────────
    if (msg.text) {
      const text = msg.text.trim();

      // /brain <query> — search the vault
      if (text.startsWith("/brain")) {
        const query = text.slice(6).trim();
        if (!query) {
          await sendTelegramMessage(chatId, "Usage: /brain <search query>");
          return;
        }
        await handleBrainSearch(chatId, query);
        return;
      }

      // /daily — show today's daily note
      if (text === "/daily") {
        await handleDailyNote(chatId);
        return;
      }

      // /note <text> — explicit vault save
      if (text.startsWith("/note")) {
        const noteText = text.slice(5).trim();
        if (!noteText) {
          await sendTelegramMessage(chatId, "Usage: /note <text to save>");
          return;
        }
        await handleIngest(chatId, noteText, ["#telegram", "#note"]);
        return;
      }

      // /ask <message> or /chat <message> — explicit Keeper invocation (kept for compatibility)
      if (text.startsWith("/ask") || text.startsWith("/chat")) {
        const question = text.startsWith("/ask") ? text.slice(4).trim() : text.slice(5).trim();
        if (!question) {
          await sendTelegramMessage(chatId, "Usage: /ask <your question>");
          return;
        }
        const response = await getKeeperResponse(question, chatId);
        await sendTelegramMessage(chatId, response);
        return;
      }

      // /start or /help
      if (text === "/start" || text === "/help") {
        await sendTelegramMessage(
          chatId,
          "*Agent Playground Keeper*\n\n" +
          "Send any message to talk with the Keeper. Commands:\n\n" +
          "/note <text> — save a note to your brain\n" +
          "/brain <query> — search your brain\n" +
          "/daily — view today's daily note\n\n" +
          "Voice notes, photos, and documents are processed automatically."
        );
        return;
      }

      // Any other text → route to Playground Keeper (bidirectional coordinator chat)
      const response = await getKeeperResponse(text, chatId);
      await sendTelegramMessage(chatId, response);
      return;
    }

    // ── Voice note → transcribe → ingest ──────────────────────────────────────
    if (msg.voice) {
      const transcript = await transcribeAudio(msg.voice.file_id, msg.voice.duration);
      await handleIngest(
        chatId,
        transcript,
        ["#telegram", "#voice"],
        `🎙️ Voice note saved to your brain`
      );
      return;
    }

    // ── Audio file → transcribe → ingest ──────────────────────────────────────
    if (msg.audio) {
      const transcript = await transcribeAudio(msg.audio.file_id, msg.audio.duration);
      const label = msg.audio.file_name ? ` (${msg.audio.file_name})` : "";
      await handleIngest(
        chatId,
        transcript,
        ["#telegram", "#audio"],
        `🎵 Audio${label} saved to your brain`
      );
      return;
    }

    // ── Photo → vision description → ingest ───────────────────────────────────
    if (msg.photo) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        await sendTelegramMessage(chatId, "⚠️ ANTHROPIC_API_KEY is not configured.");
        return;
      }

      const photo = msg.photo[msg.photo.length - 1];
      const photoBuffer = await downloadTelegramFile(photo.file_id);
      const base64 = photoBuffer.toString("base64");
      const caption = msg.caption ?? "";

      const client = new Anthropic({ apiKey });
      const res = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        system: "Describe this image in detail for a personal knowledge base note. Include what you see, any text visible, and any relevant context. Be specific and factual.",
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
              { type: "text", text: caption || "Describe this image." },
            ],
          },
        ],
      });

      const description = res.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");

      const noteContent = caption
        ? `Caption: ${caption}\n\n${description}`
        : description;

      await handleIngest(
        chatId,
        noteContent,
        ["#telegram", "#photo"],
        `📷 Photo saved to your brain`
      );
      return;
    }

    // ── Document → extract text → ingest ──────────────────────────────────────
    if (msg.document) {
      const filename = msg.document.file_name ?? "document";
      const extractedText = await extractDocumentText(msg.document.file_id, filename, msg.document.mime_type);
      const caption = msg.caption ?? "";
      const noteContent = caption
        ? `${extractedText}\n\nNote: ${caption}`
        : extractedText;

      await handleIngest(
        chatId,
        noteContent,
        ["#telegram", "#document"],
        `📄 Document "${filename}" saved to your brain`
      );
      return;
    }

    await sendTelegramMessage(chatId, "I can handle text, voice notes, photos, and documents. Send me a message!");

  } catch (err) {
    console.error("[telegram] Error processing update:", err);
    await sendTelegramMessage(chatId, "⚠️ Something went wrong. Please try again.");
  }
}
