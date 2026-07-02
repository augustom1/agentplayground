# Feature 05 — Messaging Channels (Email + WhatsApp)

> Status: ⬜ Not started
> Effort: Email = 1 day, WhatsApp = 2 days
> Dependencies: Feature 03 (Telegram) patterns are reusable here

---

## Overview

Both channels follow the same architecture as Telegram:

```
Inbound message → webhook → identify user → Keeper processes → reply
```

The schema already has `Channel`, `ChannelMessage`, and `RoutingRule` models. We just need to wire them.

---

## Channel A — Email

### How it works

**Option 1: Resend inbound (recommended)**
- Resend supports inbound email: any email to `agent@agentplayground.net` → POST to a webhook
- Setup: add MX records pointing to Resend's inbound servers
- Resend parses the email (from, subject, body, attachments) and sends JSON to your webhook

**Option 2: Gmail polling (simpler, no DNS changes)**
- Cron job runs every 2 minutes → checks a Gmail inbox → processes unread emails
- Uses Gmail API with OAuth2 (or App Password + IMAP)
- Less elegant but works without DNS changes

**Recommended:** Start with Option 2 (Gmail polling) since DNS changes can break email. Switch to Resend inbound later.

---

### Option 2 Implementation: Gmail Polling via Cron

**New env vars:**
```env
GMAIL_USER=agent@gmail.com           # or a dedicated Gmail account
GMAIL_APP_PASSWORD=xxxx xxxx xxxx    # Google account → Security → App passwords
GMAIL_REPLY_FROM=agent@agentplayground.net  # what users see as sender (via Resend)
```

**Install:**
```bash
npm install imapflow mailparser
npm install @types/mailparser -D
```

**New file: `lib/integrations/email/processor.ts`**

```typescript
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getKeeperResponse } from '@/lib/integrations/telegram/bot';  // reuse same Keeper

export async function processInboundEmails(): Promise<void> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!,
    },
    logger: false,
  });

  await client.connect();
  
  try {
    await client.mailboxOpen('INBOX');
    
    // Fetch unread messages
    for await (const message of client.fetch('UNSEEN', { source: true })) {
      const parsed = await simpleParser(message.source);
      
      const from = parsed.from?.text ?? 'unknown';
      const subject = parsed.subject ?? '(no subject)';
      const body = parsed.text ?? parsed.html ?? '';
      
      // Build prompt for Keeper
      const userMessage = `[Email from ${from}]
Subject: ${subject}

${body.slice(0, 5000)}`;

      // Use sender email as identifier (similar to Telegram chat ID)
      const emailHash = Buffer.from(from).toString('base64').slice(0, 20);
      
      // Get Keeper response
      const response = await getKeeperResponse(userMessage, parseInt(emailHash, 36) % 2147483647);
      
      // Reply via Resend
      if (process.env.RESEND_API_KEY) {
        await sendEmailReply({
          to: parsed.from?.value[0]?.address ?? '',
          subject: `Re: ${subject}`,
          body: response,
          replyToMessageId: parsed.messageId,
        });
      }
      
      // Mark as read
      await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
    }
  } finally {
    await client.logout();
  }
}

async function sendEmailReply({ to, subject, body, replyToMessageId }: {
  to: string; subject: string; body: string; replyToMessageId?: string;
}) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.GMAIL_REPLY_FROM ?? 'agent@agentplayground.net',
      to: [to],
      subject,
      text: body,
      headers: replyToMessageId ? { 'In-Reply-To': replyToMessageId } : undefined,
    }),
  });
}
```

**Wire into cron job (`app/api/cron/route.ts`):**
```typescript
// Add to the cron handler (runs every minute):
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  // Only run every 2 minutes to avoid hammering Gmail
  const minuteOfDay = Math.floor(Date.now() / 60000);
  if (minuteOfDay % 2 === 0) {
    import('@/lib/integrations/email/processor')
      .then(({ processInboundEmails }) => processInboundEmails())
      .catch((err) => console.error('[email-cron]', err));
  }
}
```

---

### Option 1: Resend Inbound Webhook (for later)

**New endpoint: `app/api/channels/email/webhook/route.ts`**

```typescript
// Resend sends a POST with this structure:
// { from, to, subject, text, html, attachments: [...] }

export async function POST(req: Request) {
  const data = await req.json();
  
  const userMessage = `[Email from ${data.from}]
Subject: ${data.subject}

${(data.text ?? data.html ?? '').slice(0, 5000)}`;

  // Process and reply
  // Same pattern as Telegram webhook
}
```

**DNS setup for Resend inbound:**
```
MX  @  inbound.resend.com  10
TXT @  resend-inbound-verification=...
```

---

## Channel B — WhatsApp via Twilio

### Requirements

- Twilio account (free to start with sandbox)
- WhatsApp Sandbox (for testing — no business account needed)
- For production: WhatsApp Business account + Meta approval

**New env vars:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # Twilio sandbox number
```

**Install:**
```bash
npm install twilio
```

---

### Webhook: `app/api/channels/whatsapp/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getKeeperResponse, transcribeAudio } from '@/lib/integrations/telegram/bot';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  
  const from = formData.get('From') as string;           // whatsapp:+54911...
  const body = formData.get('Body') as string ?? '';
  const mediaUrl = formData.get('MediaUrl0') as string;
  const mediaType = formData.get('MediaContentType0') as string;
  const numMedia = parseInt(formData.get('NumMedia') as string ?? '0');
  
  // Validate Twilio signature (security)
  // TODO: validate X-Twilio-Signature header
  
  let userMessage = body;
  
  if (numMedia > 0 && mediaUrl) {
    if (mediaType?.startsWith('audio/')) {
      // Download and transcribe
      // Twilio audio URLs require auth
      const authHeader = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64');
      
      const audioRes = await fetch(mediaUrl, {
        headers: { Authorization: `Basic ${authHeader}` },
      });
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      
      // Transcribe using Whisper
      if (process.env.OPENAI_API_KEY) {
        const blob = new Blob([audioBuffer], { type: mediaType });
        const form = new FormData();
        form.append('file', blob, 'audio.ogg');
        form.append('model', 'whisper-1');
        
        const transcribeRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: form,
        });
        const transcription = await transcribeRes.json();
        userMessage = `[Voice note transcript]: "${transcription.text}"`;
      }
      
    } else if (mediaType?.startsWith('image/')) {
      userMessage = `[Image attached] ${body}`;
      // TODO: download image → base64 → Claude vision
    }
  }
  
  if (!userMessage.trim()) {
    return new NextResponse('', { status: 200 });
  }
  
  // Use phone number as unique identifier
  const phoneHash = parseInt(from.replace(/\D/g, '').slice(-10)) % 2147483647;
  
  // Process async — Twilio has a 15 second timeout for webhook responses
  const responsePromise = getKeeperResponse(userMessage, phoneHash);
  
  // Send immediate acknowledgment 
  // (Twilio TwiML format for WhatsApp)
  const response = await responsePromise;
  
  // Send via Twilio API
  await sendWhatsAppMessage(from.replace('whatsapp:', ''), response);
  
  return new NextResponse('', { status: 200 });
}

async function sendWhatsAppMessage(to: string, body: string) {
  const twilio = (await import('twilio')).default;
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  // WhatsApp messages have a 1600 char limit
  const truncated = body.length > 1500 ? body.slice(0, 1497) + '...' : body;
  
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM!,
    to: `whatsapp:${to}`,
    body: truncated,
  });
}
```

**Add to `middleware.ts` public routes:**
```typescript
// In the public paths matcher:
'/api/channels/:path*',
```

---

### WhatsApp Sandbox Setup (Twilio)

```
1. Create Twilio account → twilio.com
2. Console → Messaging → Try it out → Send a WhatsApp message
3. Follow sandbox join instructions (send "join <word>" to sandbox number)
4. Set webhook: Console → Messaging → Settings → WhatsApp sandbox settings
   → "When a message comes in": https://app.agentplayground.net/api/channels/whatsapp/webhook
5. Add env vars to VPS .env.local
6. Rebuild dashboard container
```

---

## Shared Pattern: Channel Message Logging

All channels should log messages to the `channel_messages` table for audit:

```typescript
// After processing any channel message, log it:
await prisma.channelMessage.create({
  data: {
    channelId: channel.id,  // need to look up or create channel record
    direction: 'inbound',
    content: userMessage,
    sender: from,
    metadata: { source: 'telegram' | 'whatsapp' | 'email', processedAt: new Date() },
  },
});
```

This is optional for MVP but useful for monitoring.

---

## Channels Settings UI

Add a "Channels" section to `app/(app)/settings/page.tsx`:

```
[Telegram]
  Bot token: ●●●●●●●configured●●●●●●
  Webhook: https://app.agentplayground.net/api/telegram/webhook ✓
  Status: Active — 23 messages processed

[WhatsApp]
  Twilio SID: not configured
  [Connect WhatsApp →]

[Email]
  Gmail: agent@gmail.com
  Status: Polling every 2 minutes — 5 emails processed
```

---

## Priority Order for This Feature

1. **Email via Gmail polling** — easiest, no new services needed beyond Gmail App Password
2. **Telegram voice notes** — already in Feature 03, highest user value
3. **WhatsApp sandbox** — good for demo, needs Twilio account
4. **WhatsApp production** — needs Meta business approval (can take weeks)
