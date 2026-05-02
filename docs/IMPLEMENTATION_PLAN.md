# Implementation Plan — Agent Playground Feature Roadmap

> Last updated: 2026-04-16
> This file is the master tracker. Update status as features complete.
> Each feature has a detailed spec in `docs/features/`.

---

## Priority Queue (ordered — do top to bottom)

| # | Feature | File | Status | Est. Effort |
|---|---|---|---|---|
| 1 | Token counter in chat | `features/01-token-counter.md` | ✅ Done (2026-04-16) | 2-3 hrs |
| 2 | File / image / audio in chat | `features/02-file-media-chat.md` | ✅ Done (2026-04-16) | 1-2 days |
| 3 | Telegram — voice notes + media | `features/03-telegram-full.md` | ✅ Done (2026-04-16) | 1.5 days |
| 4 | Auto-install CLI tools (npm/pip) | `features/04-auto-tool-installer.md` | ✅ Done (2026-04-16) | 2-3 days |
| 5 | MCP auto-install | `features/04-auto-tool-installer.md` | ✅ Done (2026-04-16) | builds on #4 |
| 6 | Email channel | `features/05-messaging-channels.md` | ✅ Done (2026-04-16) | 1 day |
| 7 | WhatsApp channel | `features/05-messaging-channels.md` | ✅ Done (2026-04-16) | 2 days |

---

## What Already Exists (do NOT re-implement)

### Telegram text bot — PARTIALLY DONE
- `lib/integrations/telegram/bot.ts` — text processing + tool loop exists
- `app/api/telegram/webhook/route.ts` — webhook handler exists
- **Missing:** voice/audio, photos, conversation memory per user

### File storage — DONE
- `app/api/files/upload/route.ts` — upload endpoint exists
- `app/api/files/download/route.ts` — download exists
- Files stored at `data/files/` inside container

### Chat tools — DONE (26 tools)
- All tools in `lib/chat-tools.ts`
- `web_search`, `web_browse`, `write_file`, `read_file`, `save_memory`, etc.

### Schema — DONE for channels
- `Channel`, `ChannelMessage`, `RoutingRule` models exist in `prisma/schema.prisma`
- Not yet wired to any API or UI

---

## New Environment Variables Needed

Add these to `.env.local` and VPS `.env.local` as you implement each feature.

```env
# Feature 2 + 3: Audio transcription (pick one approach)
OPENAI_API_KEY=sk-...           # Whisper API — $0.006/min, fast
# OR use local whisper.cpp on VPS (free, slower — see feature 02 doc)

# Feature 3: Telegram (already stubbed, just needs values)
TELEGRAM_BOT_TOKEN=...          # From @BotFather
TELEGRAM_WEBHOOK_SECRET=...     # openssl rand -hex 20

# Feature 4: SSH for tool installation on VPS
VPS_SSH_HOST=95.217.163.247
VPS_SSH_USER=root
VPS_SSH_KEY=...                 # base64-encoded private key: base64 < ~/.ssh/id_rsa

# Feature 7: WhatsApp via Twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

---

## New npm Packages by Feature

```bash
# Feature 2 — file processing
npm install pdf-parse            # PDF text extraction
npm install @types/pdf-parse -D

# Feature 3 — audio download from Telegram
npm install node-fetch           # already available via Next.js

# Feature 4 — SSH execution on VPS
npm install ssh2
npm install @types/ssh2 -D

# Feature 4 — safety checker (no extra deps, uses fetch against npm/PyPI APIs)
```

---

## New Files to Create (by feature)

### Feature 1 — Token Counter
- `app/(app)/chat/page.tsx` — modify: parse usage sentinel, show counter UI

### Feature 2 — File/Media in Chat
- `app/api/transcribe/route.ts` — NEW: Whisper transcription endpoint
- `app/api/files/extract/route.ts` — NEW: PDF/doc text extraction
- `app/(app)/chat/page.tsx` — modify: attachment button, preview in messages
- `app/api/chat/route.ts` — modify: handle image content blocks

### Feature 3 — Telegram Full
- `lib/integrations/telegram/bot.ts` — modify: add voice/photo handling
- `lib/integrations/telegram/audio.ts` — NEW: download + transcribe Telegram audio
- `lib/integrations/telegram/memory.ts` — NEW: per-user conversation persistence

### Feature 4 — Auto-Install Tools
- `lib/tool-installer/safety-checker.ts` — NEW: npm/PyPI/GitHub safety scoring
- `lib/tool-installer/installer.ts` — NEW: SSH executor + install runner
- `lib/tool-installer/mcp-registry.ts` — NEW: official MCP catalog queries
- `app/api/tools/install/route.ts` — NEW: API wrapper
- `lib/chat-tools.ts` — modify: add `search_tools` + `install_tool` tools

### Feature 5 — Email Channel
- `app/api/channels/email/webhook/route.ts` — NEW: inbound email handler
- `lib/integrations/email/processor.ts` — NEW: email → Keeper → reply

### Feature 6 — WhatsApp
- `app/api/channels/whatsapp/webhook/route.ts` — NEW
- `lib/integrations/whatsapp/bot.ts` — NEW: same pattern as Telegram

---

## Session Resume Instructions

If you are starting a new Claude session and need to continue:

1. Read this file first
2. Read the specific feature doc in `docs/features/` for what you're working on
3. Check git status to see what files were already modified
4. The most common entry point files:
   - Chat system: `app/api/chat/route.ts` + `app/(app)/chat/page.tsx`
   - Chat tools: `lib/chat-tools.ts`
   - Telegram: `lib/integrations/telegram/bot.ts`
   - Schema: `prisma/schema.prisma`

---

## Testing Checklist (run before deploying each feature)

```bash
npm run build        # must pass — next.config.ts ignores TS errors but catches syntax
npm run test         # 20 tests must stay green
npm run lint         # optional but good to check
```

Deploy command (VPS):
```bash
# 1. Create tarball (exclude secrets and generated dirs)
tar --exclude='.git' --exclude='node_modules' --exclude='.next' --exclude='.env.local' \
    --exclude='.claude' --exclude='data' -czf /tmp/vps-deploy.tar.gz .

# 2. Upload and extract
scp /tmp/vps-deploy.tar.gz root@95.217.163.247:/tmp/
ssh root@95.217.163.247 "cd /root/opt/vps && tar -xzf /tmp/vps-deploy.tar.gz"

# 3. CRITICAL: restore prod env (.env gets overwritten with dev defaults)
ssh root@95.217.163.247 "cd /root/opt/vps && cp .env.local .env"

# 4. Rebuild and restart
ssh root@95.217.163.247 "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"
```
