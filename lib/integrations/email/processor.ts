/**
 * Email channel — Gmail polling via IMAP.
 * Checks for unread emails every 2 minutes (via cron), processes them with the Keeper,
 * and sends replies via Resend.
 *
 * Required env vars:
 *   GMAIL_USER             — Gmail address to poll (e.g., agent@gmail.com)
 *   GMAIL_APP_PASSWORD     — Google App Password (Account → Security → App passwords)
 *   RESEND_API_KEY         — For sending replies (optional — without it, no reply is sent)
 *   GMAIL_REPLY_FROM       — Sender address for replies (default: agent@agentplayground.net)
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getKeeperResponse } from "@/lib/integrations/telegram/bot";

export async function processInboundEmails(): Promise<{ processed: number; errors: number }> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log("[email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping");
    return { processed: 0, errors: 0 };
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  let processed = 0;
  let errors = 0;

  await client.connect();

  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      // Fetch unseen messages
      for await (const message of client.fetch("UNSEEN", { source: true })) {
        try {
          const parsed = await simpleParser(message.source);

          const from = parsed.from?.text ?? "unknown";
          const subject = parsed.subject ?? "(no subject)";
          const body = (parsed.text ?? parsed.html ?? "").slice(0, 5000);

          const userMessage = `[Email from ${from}]\nSubject: ${subject}\n\n${body}`;

          // Use sender address as a stable numeric ID for conversation memory
          const fromAddress = parsed.from?.value?.[0]?.address ?? from;
          const emailId = stableHash(fromAddress);

          const response = await getKeeperResponse(userMessage, emailId);

          // Reply via Resend if configured
          if (process.env.RESEND_API_KEY && fromAddress) {
            await sendEmailReply({
              to: fromAddress,
              subject: `Re: ${subject}`,
              body: response,
              replyToMessageId: parsed.messageId ?? undefined,
            });
          }

          // Mark as read
          await client.messageFlagsAdd({ uid: message.uid }, ["\\Seen"]);
          processed++;
        } catch (err) {
          console.error("[email] Error processing message:", err);
          errors++;
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  if (processed > 0) {
    console.log(`[email] Processed ${processed} email(s), ${errors} error(s)`);
  }

  return { processed, errors };
}

/** Send an email reply via Resend */
async function sendEmailReply({
  to,
  subject,
  body,
  replyToMessageId,
}: {
  to: string;
  subject: string;
  body: string;
  replyToMessageId?: string;
}): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.GMAIL_REPLY_FROM ?? "agent@agentplayground.net",
      to: [to],
      subject,
      text: body,
      headers: replyToMessageId ? { "In-Reply-To": replyToMessageId, References: replyToMessageId } : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend reply failed:", err);
  }
}

/** Convert an email address string to a stable positive integer for use as chat ID */
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) & 0x7fffffff;
  }
  return hash || 1;
}
