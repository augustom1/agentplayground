# Feature 03 — Telegram Full Implementation (Voice + Media + Memory)

> Status: 🟡 Partial — text messages work, voice/media/memory missing
> Effort: 1.5 days
> Dependencies: Feature 02 audio transcription must be built first (or built together)

---

## What Already Works

- `lib/integrations/telegram/bot.ts` — full text processing loop with Claude tools
- `app/api/telegram/webhook/route.ts` — webhook handler with secret validation
- `sendTelegramMessage()` — sends text replies
- `getKeeperResponse()` — runs Claude with all 26 chat tools

**The bot works right now for text.** These are the gaps:

---

## What's Missing

1. **Voice notes** — Telegram sends `.ogg` files; bot currently ignores them
2. **Photos** — bot ignores photo messages
3. **Documents** (PDFs, files) — ignored
4. **Conversation memory** — every message is stateless; bot forgets previous messages in the same session
5. **User linking** — no connection between Telegram user ID and app User account
6. **Typing indicator** — no "bot is typing..." while processing

---

## Setup Instructions (do this before writing code)

```bash
# 1. Create bot via Telegram
# Open Telegram → search @BotFather → /newbot → follow prompts
# You get a token like: 7123456789:AAHdqTcvCH1vGBm1X0tF3oJSmFoGjHBiA1U

# 2. Generate webhook secret
openssl rand -hex 20
# Example output: a3f5c2e1b8d4f6a9c2e5b7d1f3a6c8e2b5d7f9a1

# 3. Register webhook with Telegram
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://app.agentplayground.net/api/telegram/webhook?secret_token=<SECRET>" \
  -d "allowed_updates=[\"message\"]"

# 4. Add to VPS .env.local:
TELEGRAM_BOT_TOKEN=7123456789:AAHdqTcvCH1vGBm1X0tF3oJSmFoGjHBiA1U
TELEGRAM_WEBHOOK_SECRET=a3f5c2e1b8d4f6a9c2e5b7d1f3a6c8e2b5d7f9a1
```

---

## Voice Note Flow (the killer feature)

```
User sends voice note in Telegram
  → Telegram bot receives update with: message.voice.file_id
  → Bot calls Telegram API: getFile(file_id) → gets file_path
  → Bot downloads: https://api.telegram.org/file/bot<TOKEN>/<file_path>
  → File is a .ogg/opus audio file
  → POST to /api/transcribe (or call Whisper directly from bot)
  → Get transcript text
  → Call getKeeperResponse(transcript, chatId) with memory context
  → Keeper may call tools: web_search, write_file, schedule_task, etc.
  → Reply to Telegram with result
```

---

## Code Changes to `lib/integrations/telegram/bot.ts`

### 1. Extend TelegramUpdate interface

```typescript
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; username?: string; language_code?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
    // ADD THESE:
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
    caption?: string;  // Text sent alongside photo/video
  };
}
```

### 2. Download file from Telegram helper

```typescript
async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  // Step 1: Get the file path from Telegram
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`getFile failed: ${JSON.stringify(data)}`);
  
  const filePath = data.result.file_path;
  
  // Step 2: Download the actual file
  const fileRes = await fetch(
    `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`
  );
  if (!fileRes.ok) throw new Error(`File download failed: ${fileRes.status}`);
  
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  return buffer;
}
```

### 3. Transcribe audio from Telegram

```typescript
async function transcribeAudio(fileId: string, durationSeconds: number): Promise<string> {
  const audioBuffer = await downloadTelegramFile(fileId);
  
  // Use OpenAI Whisper API
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `[Voice note — ${durationSeconds}s — transcription unavailable: set OPENAI_API_KEY]`;
  }
  
  // Create a File-like object for the fetch FormData
  const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
  const formData = new FormData();
  formData.append('file', blob, 'voice.ogg');
  formData.append('model', 'whisper-1');
  // Don't set language — let Whisper auto-detect (handles Spanish/English)
  
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  
  const data = await res.json();
  return data.text || '[Could not transcribe audio]';
}
```

### 4. Conversation memory per Telegram user

Each Telegram chat gets a persistent conversation stored in the DB:

```typescript
async function getOrCreateConversation(telegramChatId: number): Promise<string> {
  // Look up existing conversation for this Telegram chat
  // We store the Telegram chat ID in the conversation title
  const existing = await prisma.chatConversation.findFirst({
    where: { title: `telegram:${telegramChatId}` },
    orderBy: { updatedAt: 'desc' },
  });
  
  if (existing) return existing.id;
  
  // Create new
  const conv = await prisma.chatConversation.create({
    data: { title: `telegram:${telegramChatId}` },
  });
  return conv.id;
}

async function getConversationHistory(conversationId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,  // last 20 messages for context
  });
  
  return messages.map(m => ({ 
    role: m.role as 'user' | 'assistant', 
    content: m.content 
  }));
}

async function saveMessage(conversationId: string, role: 'user' | 'assistant', content: string) {
  await prisma.chatMessage.create({
    data: { conversationId, role, content },
  });
}
```

### 5. Updated `getKeeperResponse` with memory

```typescript
export async function getKeeperResponse(
  userMessage: string, 
  telegramChatId: number
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return '⚠️ ANTHROPIC_API_KEY is not configured.';

  // Load conversation history
  const conversationId = await getOrCreateConversation(telegramChatId);
  const history = await getConversationHistory(conversationId);

  // ... (existing system prompt building) ...

  // Build messages with history
  const messages = [
    ...history,
    { role: 'user' as const, content: userMessage },
  ];

  // ... (existing Claude call loop) ...

  // Save to conversation after response
  await saveMessage(conversationId, 'user', userMessage);
  await saveMessage(conversationId, 'assistant', result);

  return result;
}
```

### 6. Updated `processUpdate` to handle all message types

```typescript
export async function processUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg?.chat) return;

  const chatId = msg.chat.id;

  try {
    // Show typing indicator
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    });

    let userMessage: string;

    if (msg.voice) {
      // Voice note
      const transcript = await transcribeAudio(msg.voice.file_id, msg.voice.duration);
      userMessage = `[Voice note transcript]: "${transcript}"`;
      
    } else if (msg.audio) {
      // Audio file
      const transcript = await transcribeAudio(msg.audio.file_id, msg.audio.duration);
      userMessage = `[Audio file: ${msg.audio.file_name ?? 'audio'}]: "${transcript}"`;
      
    } else if (msg.photo) {
      // Photo — get largest size
      const photo = msg.photo[msg.photo.length - 1];
      const photoBuffer = await downloadTelegramFile(photo.file_id);
      const base64 = photoBuffer.toString('base64');
      const caption = msg.caption ?? 'What is in this image?';
      // Pass to a vision-capable version of getKeeperResponse
      userMessage = `[Photo attached, base64 omitted for memory context. Caption: "${caption}"]`;
      // TODO: wire image into Anthropic vision message block
      // For now, acknowledge receipt
      const response = await getKeeperResponse(
        `User sent a photo with caption: "${caption}". Tell them you can see their image and describe what they should do next.`,
        chatId
      );
      await sendTelegramMessage(chatId, response);
      return;
      
    } else if (msg.document) {
      userMessage = `[Document attached: ${msg.document.file_name ?? 'file'}, ${(msg.document.file_size ?? 0 / 1024).toFixed(0)}KB. ${msg.caption ?? 'Please process this document.'}]`;
      
    } else if (msg.text) {
      userMessage = msg.text;
      
    } else {
      // Unsupported message type (sticker, video, etc.)
      await sendTelegramMessage(chatId, 'I can handle text messages, voice notes, and photos. Send me a message!');
      return;
    }

    const response = await getKeeperResponse(userMessage, chatId);
    await sendTelegramMessage(chatId, response);

  } catch (err) {
    console.error('[telegram] Error processing update:', err);
    await sendTelegramMessage(chatId, '⚠️ Something went wrong. Please try again.');
  }
}
```

---

## New File: `lib/integrations/telegram/audio.ts`

Move audio download + transcription logic here to keep `bot.ts` clean:

```typescript
// Standalone module for Telegram audio processing
export async function downloadTelegramFile(fileId: string): Promise<Buffer> { ... }
export async function transcribeAudio(fileId: string, durationSeconds: number): Promise<string> { ... }
```

---

## The Full Demo Scenario

1. You're out, you think of an app idea
2. Open Telegram → send voice note: *"Quiero hacer una app para gestionar turnos de peluquería con recordatorios automáticos por WhatsApp"*
3. Bot replies (within ~15 seconds): *"Entendido. Voy a guardar tu idea y hacer investigación de mercado básica. Un momento..."*
4. Bot calls: `write_file("ideas/peluqueria-app.md", ...)` + `web_search("barbershop appointment app market size 2026")`
5. Bot replies: *"Listo! Guardé tu idea en Files > ideas/peluqueria-app.md. Hay 3 competidores principales en LATAM: [lista]. Mercado estimado: $2.1B. Cuando vuelvas a la computadora podés leer el análisis completo."*
6. You get home → open app → Files → `ideas/peluqueria-app.md` → full research doc waiting

---

## Testing

1. Send `/start` to the bot — should reply with a greeting
2. Send a text message — should process and reply with Claude's response
3. Send a voice note — should transcribe and reply
4. Send the same topic twice — second message should show it remembers context

---

## Known Limitations

- Telegram's 4096 char message limit — already handled with truncation in `sendTelegramMessage`
- Bot can't send files back to Telegram yet (only text) — add `sendDocument()` for future
- No user authentication — anyone who finds the bot can use it. Add a whitelist via `TELEGRAM_ALLOWED_USER_IDS` env var for security
- Photo vision is partially stubbed — full implementation requires passing base64 to Claude vision API in a separate flow from text messages (the Anthropic API call structure is different)
