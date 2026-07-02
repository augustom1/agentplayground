# docs/PLAN.md — Master Open Work List
> Updated: 2026-07-02 (Session 32 — repo cleanup + plan realignment)
> Source of truth for direction: `docs/VISION.md`. If anything here contradicts it, VISION wins.
> Session state: `HANDOFF.md` (root). Session history: `docs/SESSION-HISTORY.md`.
> Superseded plans live in `docs/archive/` (kept for history, do not follow them).

---

## Build order (from VISION §5)

**UI restoration → repo cleanup → n8n MCP tools → self-service Telegram bots → permission rings → deployment capabilities.**

One concern per session where possible. Every session ends with a passing Docker build.

- ✅ Repo cleanup — DONE (Session 32, this session — done out of order because the tree was blocking work)
- 🔜 **UI restoration — NEXT SESSION**
- then §3, §4, §5 below in order

---

## 1. NEXT SESSION — UI Restoration (VISION §2)

**Goal:** replace the disliked redesign (flat Chat/Overview/Playgrounds nav, rust asterisk logo, rust accents) with the liked pre-redesign feel, reorganized into exactly FOUR top-level sections.

### Git facts (already researched in Session 32 — do not re-derive)

- The liked UI is recoverable at commit **`5213954`** (Session 22, 2026-06-26): charcoal Design System v3 tokens (`app/globals.css` — still unchanged, keep them), blue-cyan `#38BDF8` brand accent, collapsible sidebar with pill tab box, recents list, hamburger menu.
- The disliked redesign landed entirely in commit **`404a125`**: full `components/Sidebar.tsx` rewrite, `components/Logo.tsx` replaced with a rust asterisk (too close to Anthropic's mark — must go), rust `#D4715A` hardcoded in 9 app/component files.
- The build-breaking slug conflict from the failed revert was fixed in Session 32.

### Work items

1. **Sidebar**: recover the `5213954` sidebar's visual language (`git show 5213954:components/Sidebar.tsx`) and adapt to exactly four sections — no fifth without owner approval:
   - **Chats** — recents + picker: Playground Keeper or team heads (`/chat`)
   - **Playgrounds** — list only, click to enter `/playground/[id]` (keep the inner playground environment from sessions 28–30; the complaint was the top-level layout, not those pages)
   - **Teams** — agent teams, skills, optimizer (consolidates `/agent-lab`, `/optimize`, `/tools`)
   - **Brain** — RAG docs, files, notes; future home of doc-level agent access grants (`/files`, `/notes`)
   - Everything else (`/overview`, `/cv`, `/learn`, `/billing`, admin) leaves top-level nav; Settings/Admin stay in the hamburger. Pages stay routable for now.
2. **MobileNav**: same four sections (Session 32 left a temporary `/overview` tab patch).
3. **Colors**: remove the 9 hardcoded `#D4715A` occurrences in app/components, back to `--color-brand` tokens (blue-cyan on charcoal). Marketing/AR pages are out of scope.
4. **Logo**: new ORIGINAL terminal-style mark (monospace/prompt aesthetic, e.g. `>_` with block cursor) — show the owner 2–3 SVG variants before wiring in. Do NOT imitate Anthropic/Claude's asterisk. Fallback stopgap: restore the BrainNetwork mark from `5213954`.
5. **Centering pass**: main content areas are off-center per owner; fix alignment on all four sections.
6. **Verify**: visual pass on all four sections + passing `docker compose build`.

### Rules while doing it

- Claude Desktop feel: clean, minimal, generous whitespace. When choosing between adding and removing an element, remove.
- No emojis anywhere in the UI. No decorative icon noise.

---

## 2. Repo cleanup (VISION §3) — ✅ DONE Session 32

- Stale specs → `docs/archive/` (root cleared of 12 stale .md files, `docs/pivot/`, `docs/features/`, old website)
- Infra how-tos → `docs/ops/`; loose root scripts → `scripts/`
- Vision file → `docs/VISION.md`; business docs updated in `business/`
- Remaining follow-up: none blocking. `docs/architecture.md` and `docs/PROTOCOLS.md` are code-referenced (Brain indexing) — refresh their content opportunistically.

---

## 3. n8n MCP tools (VISION §4.3.1)

Agents create/modify their own n8n workflows via the n8n API — workflows stay visible and inspectable by humans.

- MCP tools (in `app/api/mcp/route.ts` layer): `n8n_list_workflows`, `n8n_get_workflow`, `n8n_create_workflow`, `n8n_update_workflow`, `n8n_activate_workflow`, `n8n_run_webhook`
- Auth via n8n API key from env (`N8N_API_KEY`), never exposed to the model
- Every agent-made workflow change = automatic commit to a config repo (forensics via `git log`, recovery via `git revert`)
- Each tool declares its permission ring (GREEN for own workflows) — ring lives in the tool layer, not prompts

## 4. Self-service Telegram bots (VISION §4.3.2)

- Agents can register and run their own Telegram bots using tokens already provisioned to the system
- Output channels are an abstraction: Telegram/Discord/email as first-class adapters (Instagram = fragile adapter, never core)

## 5. Permission rings + approver flow + audit log (VISION §4.3.3)

- **GREEN** fully autonomous / **YELLOW** autonomous + audit log the Keeper can summarize / **RED** owner approves with one tap via Telegram
- Rings enforced in the MCP tool layer — prompts can be injection-attacked, tool scopes cannot
- RED covers: payments, private keys, destructive deletion, permission-system changes, client credentials

## 6. Deployment capabilities (VISION §4.3.4)

- Agents deploy/restart their own containers, request new subdomains (YELLOW: Traefik changes audited)
- Gated entirely by the rings from §5

---

## Cross-cutting requirements (apply to every feature above)

- **Budget first-class:** per-agent/per-team daily token budgets, Keeper burn-rate reports, automatic kill-switch on runaway loops. Later becomes a client-facing dashboard.
- **Prompt injection defense:** all external content agents read is untrusted; safety comes from ring architecture, not prompt instructions.
- **Agent changes are git commits:** workflows, bots, configs — infrastructure-as-code written by agents.
- **Per-client API keys:** client-facing deployments run on the client's own LLM key (or metered with explicit markup). Never silently absorb client token costs.
- **Generic platform features, not one-off scripts:** if code only serves one demo, it's scope creep (VISION §1).
- **Multi-tenant-aware from the start:** per-client Docker Compose stacks, resource caps, separate networks, Traefik routing per domain.

---

## Backlog (not scheduled — do not start without owner approval)

- Doc-level agent access grants in Brain (grant/revoke per doc) — belongs to the Brain section, VISION §2.1.4
- Obsidian vault integration as persistent memory layer (Brain section)
- Playground Library: catalog of ready-made playgrounds clients can browse/deploy (see `business/`)
- Docker Hub push + friends release (was "Phase 2 done" step; now blocked behind UI restoration)
- Empty states (Plans, Teams, Brain, Schedule); LLM provider settings UI polish

---

## Hard constraints (VISION §0 — never violate)

- No Zod — Valibot only
- Prisma 7 with `@prisma/adapter-pg` — never downgrade/swap
- Never break the Docker build; every session ends green
- No emojis in the UI
- Docker Compose + Traefik on Hetzner VPS; deploy via `scp`, never `git pull` on the server
- LLM routing: local Ollama + Claude API — never hardcode a single provider
