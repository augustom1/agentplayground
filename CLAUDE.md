# CLAUDE.md — Agent Playground

> **Read order every session:** HANDOFF.md → docs/VISION.md → docs/PLAN.md → this file (constraints + commands only).
> `docs/VISION.md` is the source of truth. If any other doc contradicts it, VISION wins.

---

## Session Start Protocol

At the start of **every session**, before any code work:

1. Read `HANDOFF.md` — current live state + next priorities
2. Read `docs/VISION.md` — product vision, hard constraints, roadmap direction
3. Read `docs/PLAN.md` — master open work list
4. Generate a session opener report comparing last session's planned work vs what was done. Format:

```
## Session Report — YYYY-MM-DD
**Last planned:** [what HANDOFF.md said was next]
**Done last session:** [from HANDOFF.md Session History]
**Status:** on track | deviation | new direction
**Starting now:** [what we'll work on today]
```

5. Present the report to the user before doing anything else.
6. At end of session: update `HANDOFF.md` Next Session section + run `generate_session_report` tool in chat to push report to Brain. Every session ends with a passing Docker build.

---

## Hard Constraints

- **No Zod** — Valibot only for validation
- **No git pull on VPS** — deploy via `scp` only
- **Never break Docker standalone output** — Next.js `output: 'standalone'`
- **No new major deps** without explaining tradeoff first
- **No `any` types** in TypeScript
- **No secrets** in docker-compose.yml — `.env.local` only
- **Slug rule:** every `[param]` segment at the same URL depth must use the same name (e.g. all routes under `app/api/playground/teams/[id]/` use `[id]`)
- **Deploy rule:** after deleting directories, always rebuild with `--no-cache`
- **No emojis anywhere in the UI** — no decorative icon noise
- **LLM routing:** local Ollama + Claude API — never hardcode a single provider

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 · App Router · `output: 'standalone'` |
| Language | TypeScript — no `any` |
| Database | PostgreSQL 16 + pgvector · Prisma 7 (`@prisma/adapter-pg`) |
| Auth | NextAuth v5 · JWT strategy |
| Styling | Tailwind CSS v4 |
| AI | Anthropic Claude SDK · OpenAI · Ollama |
| Infra | Docker Compose · Traefik · Redis |

---

## Commands

```bash
# Development
npm run dev                 # dev server port 3000

# Prisma
npx prisma generate         # regenerate client after schema change
npx prisma db push          # push schema to DB (no migration file)

# Deploy — ALWAYS scp, never git pull on server
scp -i ~/.ssh/id_ed25519 <file> root@95.217.163.247:/root/opt/vps/<path>
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"

# Force no-cache rebuild (after deleting dirs or big structural changes)
ssh ... "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache dashboard && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d dashboard"
```

---

## Key Environment Variables

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Auto-built by entrypoint.sh |
| `AUTH_SECRET` | ✅ | NextAuth JWT (≥32 chars) |
| `ANTHROPIC_API_KEY` | ✅ prod | Claude API |
| `CRON_SECRET` | ✅ | Cron bearer token |
| `NEXTAUTH_URL` | ✅ prod | |
| `OLLAMA_BASE_URL` | ⚠️ | default: `http://ollama:11434` |
| `VAULT_CONTEXT_ENABLED` | ⚠️ | `true` on VPS enables Brain injection |
| `REGISTRATION_OPEN` | ⚠️ | Self-registration master switch — unset/false = closed (default). Set `true` only when selling; invite-code gate (`REQUIRE_INVITE_CODE`, code = CRON_SECRET) applies on top |
| `TELEGRAM_BOT_TOKEN` | ⚠️ | Telegram integration |
| `BRAVE_SEARCH_API_KEY` | ⚠️ | Web search (DuckDuckGo fallback if unset) |
| `VPS_SSH_KEY` | ⚠️ | Tool installer via SSH |

---

## Key File Paths

| What | Where |
|---|---|
| Chat API (streaming + tools) | `app/api/chat/route.ts` |
| All chat tools (30 tools) | `lib/chat-tools.ts` |
| Agent runners | `lib/agents/runner.ts` · `lib/agents/delegated.ts` |
| Brain helpers | `lib/brain/index.ts` · `lib/brain/ingest.ts` |
| Seed teams | `lib/seed-teams.ts` |
| Auth config | `auth.ts` + `middleware.ts` |
| Design tokens | `app/globals.css` |
| Billing wallets | `app/(app)/billing/page.tsx` → `WALLETS` constant |
| API error helper | `lib/api-error.ts` |
| Sidebar + customization | `components/Sidebar.tsx` · `components/CustomizeSidebar.tsx` · `lib/sidebar-registry.ts` (`/api/settings/sidebar`) |
| Store / Playground Library | `app/(app)/store/page.tsx` · `lib/store-catalog.ts` |
| Redirect app | `app/(app)/apps/redirect/page.tsx` · `app/r/[code]/route.ts` · `app/api/redirect-links/` |
| Build-your-own app SDK | `downloads/playground-app-template/` |
| VPS app path | `/root/opt/vps/` |

---

## Repo Structure (reorganized 2026-07-02, Session 32)

| Where | What |
|---|---|
| `docs/VISION.md` | Source of truth — vision, hard constraints, UI spec, roadmap |
| `docs/PLAN.md` | Master open work list (next session lives here) |
| `docs/PROTOCOLS.md` · `docs/architecture.md` · `docs/DEPLOY-PROTOCOL.md` | Working docs (code-referenced by Brain indexing — do not move) |
| `docs/context/` · `docs/BLOGPOSTS.md` · `docs/reports/` | Code-referenced by seed/overnight routes — do not move |
| `docs/ops/` | Infra how-tos (Cloudflare, deployment, Traefik SSL, VPS) |
| `docs/archive/` | Superseded specs and plans — history only, never follow them |
| `business/` | How the company runs — start at `business/CLAUDE.md` then `business/00-overview.md` |
| `scripts/` | Operational scripts (setup.sh, add-site.sh, backup-db.sh, seeds) |
| `KEYS.md` · `SOCIAL_MEDIA_SETUP.md` | Gitignored credential notes — must stay at root (ignore rules match exact path) |
| `entrypoint.sh` · `ollama-entrypoint.sh` | Referenced by Dockerfiles — must stay at root |

---

## API Route Pattern

```typescript
const session = await auth();
if (!session?.user?.id) return apiError("Unauthorized", 401);
// role check if needed: if (session.user.role !== "admin") return apiError("Forbidden", 403);
const data = await prisma.model.findMany({ select: { id: true, name: true } }); // always use select
return NextResponse.json(data);
```
