/**
 * Telegram Bot Bridge
 *
 * Setup:
 * 1. Create a bot with @BotFather → get TELEGRAM_BOT_TOKEN
 * 2. Generate a webhook secret: openssl rand -hex 20
 * 3. Register the webhook:
 *    curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *      -d "url=https://app.DOMAIN/api/telegram/webhook?secret_token=<SECRET>" \
 *      -d "allowed_updates=[\"message\"]"
 * 4. Add to .env.local: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
 */

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { CHAT_TOOLS, executeTool } from "@/lib/chat-tools";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

/** Send a text message to a Telegram chat */
export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  // Truncate to Telegram's 4096 char limit
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

  // Try with Markdown first, fall back to plain text if it fails
  const ok = await send("Markdown");
  if (!ok) await send();
}

/** Get a Keeper response using the Anthropic API directly (bypasses auth) */
export async function getKeeperResponse(userMessage: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "⚠️ ANTHROPIC_API_KEY is not configured.";

  // Build minimal coordinator context
  const [teams, projects] = await Promise.all([
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
  ]);

  const teamSummary = teams.length > 0
    ? teams.map((t) => `- ${t.name} [${t.status}] ID:${t.id}`).join("\n")
    : "No teams yet.";

  const projectSummary = projects.length > 0
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

  return result || "I processed your request.";
}

/** Process a Telegram update and send a reply */
export async function processUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg?.text || !msg.chat) return;

  try {
    const response = await getKeeperResponse(msg.text);
    await sendTelegramMessage(msg.chat.id, response);
  } catch (err) {
    console.error("[telegram] Error processing update:", err);
    await sendTelegramMessage(msg.chat.id, "⚠️ Something went wrong. Please try again.");
  }
}
