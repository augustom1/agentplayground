# Tech Stack — AgentPlayground

> Every technology in use, why it was chosen, and key constraints to respect.

---

## Framework

**Next.js 15 — App Router — `output: 'standalone'`**
- App Router: all pages use server components by default; only interactive parts use `"use client"`
- `output: 'standalone'`: required for Docker deployment — bundles all dependencies into one directory
- Never remove `output: 'standalone'` from next.config — the Docker build will break

---

## Language

**TypeScript — strict mode — no `any`**
- `any` is forbidden — use `unknown` and narrow, or define a proper type
- All API responses must be typed
- Prisma generates types from schema — use them everywhere

---

## Database

**PostgreSQL 16 + pgvector**
- pgvector extension: stores embeddings for Brain semantic search (1536-dimension vectors from `nomic-embed-text`)
- Prisma 7 with `@prisma/adapter-pg`: required adapter for pgvector compatibility
- Schema changes: `npx prisma db push` (no migration files — push directly)
- Always use `select` in Prisma queries — never return full rows with sensitive fields
- IDs: CUID (via `@default(cuid())`)

---

## Auth

**NextAuth v5 — JWT strategy**
- JWT stored in HTTP-only cookie
- `auth()` function used in every server component and API route
- `middleware.ts` protects all routes under `/(app)/`
- Role field on User: `"user"` or `"admin"` — admin required for `/admin/**` routes
- Password: bcrypt cost 12

---

## Styling

**Tailwind CSS v4**
- Dark theme only — `bg-gray-900/950`, `text-gray-100/400`
- Design tokens in `app/globals.css` (CSS variables)
- Design System v3: charcoal `#1a1a1a` background, rust `#D4715A` accent (logo + CTAs only)
- Icons: `lucide-react` exclusively
- Conditional classes: `cn()` from `lib/utils.ts`

---

## AI

**Anthropic Claude API**
- Model IDs in use: `claude-sonnet-4-6` (coordinator + dev agents), `claude-haiku-4-5-20251001` (high-volume agents)
- Streaming: `anthropic.messages.stream()` with `for await` loop
- Extended thinking: supported in `lib/providers/anthropic.ts` via `budget_tokens`
- Tool use: all coordinator tools defined in `lib/chat-tools.ts`

**Ollama (local)**
- Host: `http://ollama:11434` (Docker network), configurable via `OLLAMA_BASE_URL`
- Models available on VPS: `qwen2.5:3b`, `qwen2.5:7b`, `nomic-embed-text`
- Used for: overnight tasks, local routing via flywheel, embedding generation
- Provider adapter: `lib/providers/ollama.ts`

**OpenAI (optional)**
- Adapter exists at `lib/providers/openai.ts`
- Not the primary provider — used if specifically requested

---

## Infra

**Docker Compose + Traefik**
- Two compose files: `docker-compose.yml` (base) + `docker-compose.prod.yml` (prod labels)
- Always run with both: `docker compose -f docker-compose.yml -f docker-compose.prod.yml`
- Traefik handles SSL + routing — no Nginx
- VPS: Hetzner, IP `95.217.163.247`, path `/root/opt/vps/`

**Redis**
- Used for: session cache + SSE event queue
- SSE broadcast: `GET /api/notify/stream` subscribes; other routes publish via Redis pub/sub

**Containers:**
- `dashboard` — Next.js app (port 3000 internal)
- `postgres` — PostgreSQL 16 + pgvector
- `redis` — session + SSE
- `ollama` — local LLM server
- `traefik` — reverse proxy + TLS

---

## Validation

**Valibot only** — Zod is forbidden. If you need runtime validation, use Valibot.

---

## Key Dependencies Table

| Package | Version | Purpose |
|---|---|---|
| next | 15 | Framework |
| @anthropic-ai/sdk | latest | Claude API |
| @prisma/client | 7 | ORM |
| @prisma/adapter-pg | 7 | pgvector compatibility |
| next-auth | v5 | Authentication |
| tailwindcss | v4 | Styling |
| lucide-react | latest | Icons |
| valibot | latest | Validation (Zod replacement) |
| ioredis | latest | Redis client |
| bcryptjs | latest | Password hashing |

---

## Hard Constraints

1. **No Zod** — Valibot only
2. **No `any` types** — TypeScript strict
3. **No `output: 'standalone'` removal** — Docker will break
4. **No git pull on VPS** — always scp files
5. **No secrets in docker-compose.yml** — `.env.local` only
6. **Always use `select` in Prisma** — never return passwordHash or full rows
7. **Slug rule**: every `[param]` at the same URL depth must use the same name
8. **No new major deps** without explaining tradeoff first
