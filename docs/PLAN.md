# docs/PLAN.md — Master Open Work List
> Updated: 2026-07-04 (owner UI feedback — UI v4 "Agentic OS shell" replaces the four-section restoration spec)
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

## 1. NEXT SESSIONS — UI v4: Agentic OS Shell (owner feedback 2026-07-04)

**Supersedes the four-section restoration spec** (archived below as §1-old context where still relevant).
Owner reviewed the deployed UI on 2026-07-04: *"did not hate it, but it still is not what I want."*
Verdict per area:
- **Playground inner environment** (`/playground/[id]`, sessions 28–30) — right track, keep and extend; make it customizable.
- **Top-level shell / main screen** — wrong. Target is the **Claude Desktop shell**: sidebar with a top tab pill, centered home greeting + large input. Owner screenshot reference: Claude Desktop's Chat/Cowork/Code tabs — but with **Playgrounds replacing Cowork**.
- **End goal (owner's words):** "a customizable agentic OS platform where you can run your stack."

### Target UX (the spec)

1. **Shell / sidebar** — Claude Desktop pattern:
   - Top tab pill: **Chat | Playgrounds | Overview** — exactly three tabs (Playgrounds where Cowork sits, Overview where Code sits).
   - **Chat tab**: New chat, **Projects** (isolated project workspaces — see item 6), Recents, chat-with picker (Keeper or team heads), and a **Brain access point** — a sidebar item that redirects to the Brain window inside the Overview tab. Brain is also usable directly from chat (tools), so this item is an accessibility/browsing shortcut, not the only path.
   - **Playgrounds tab**: (a) **Coordinator quick chat** (the task router, below), (b) the playground list.
   - **Overview tab = system hub**: the **customizable widget dashboard** (widgets from playgrounds, teams, total tasks, plans — whatever the user wants to see, in one window) + the **full Brain window** (all docs) + the **global Schedule** (everything, across all playgrounds) + utility functions cut from the old nav: **Optimize**, **websites**, tools/agent-lab-type features — as sections/windows inside it.
   - **Scoping pattern (Brain AND Schedule):** the full version lives in the Overview tab; inside a playground you only see what belongs to that playground — Brain scoped by `brainTags` (Session 29), Schedule scoped per playground.
   - No separate top-level Teams section — teams live inside their playground.
   - Home screen: centered greeting + large input to the coordinator, playground quick actions below (Claude Desktop "What's on your plate today?" feel).
2. **Coordinator task router** (Playgrounds tab quick chat):
   - User describes a task → coordinator picks the relevant team → **confirmation popup** shows its pick + reasoning → user accepts, or overrides via a playground → team picker → task dispatches (existing `delegate_to_team` / plans machinery).
3. **Overview = customizable widget dashboard:** widgets from each team/playground, user chooses which widgets appear and where; layout persisted. "In one window see everything you have working."
4. **Playground dashboards customizable:** same widget system scoped to the playground, AND the playground's inner left menu (WORKSPACE items) is user-customizable (add/remove/reorder entries).
5. **Team drill-down + agent editor:** click a team inside a playground → see its agents in detail → edit per agent:
   - LLM provider/model
   - permitted skills
   - Brain doc access (grant/revoke specific docs — pulls the old Brain-section backlog item forward)
   - file access / permissions
   - This is groundwork for permission rings (§5): the UI writes the same per-agent capability records the ring layer will enforce.
6. **Projects — isolated, disposable multi-playground workspaces** (owner example: SensorGuard, whose leftover cleanup took a whole session — that must never repeat):
   - Found under the **Chat tab → Projects** (Claude Desktop style). Opening one enters a playground-like customizable interface with reduced functions: dashboard (project-scoped widgets), chat (project context), files, schedule, settings.
   - **Own folder:** every project gets a dedicated directory (volume subpath, e.g. `/data/projects/<slug>/`) — all project files live there, never in shared areas.
   - **Own Brain namespace:** project docs ingest under a `project:<slug>` tag namespace; agents working in project context read/write ONLY that namespace, plus explicitly granted global docs (read-only borrow). Nothing project-generated touches the global Brain or other playgrounds.
   - **Teams borrowed by reference:** project work never modifies team/agent configs; project-specific context lives in the project namespace.
   - **Everything labeled:** tasks, chats, plans, and (later) deployed containers/subdomains carry the projectId (docker labels) so teardown can enumerate every trace.
   - **One-tap teardown:** Delete Project shows a preview of everything it will remove (folder, Brain namespace, tasks/chats/plans, deployments), then removes it all in one action — zero residue, zero cleanup sessions.
   - Multi-team **shared files** + coordinator orchestration across teams happen INSIDE projects — a project is the shared workspace.

### Session breakdown

- ✅ **Session 33 — Shell + home screen + theme.** (done 2026-07-04) New sidebar (tab pill **Chat | Playgrounds | Overview**; Chat tab gets Projects + Brain items — Projects can 404-stub until Session 37), centered home greeting + coordinator input, MobileNav update, purge the 9 rust `#D4715A` hardcodes → `--color-brand` tokens, wire in the new logo everywhere (app + marketing + PWA icons — the rust asterisk must not appear anywhere), **light mode**: white/grey token set with the same blue accent + theme toggle (dark stays default), centering pass.
- **Session 34 — Overview tab hub + coordinator router.** Overview tab rebuilt as the system hub — widget dashboard (static layout first: playgrounds, teams, total tasks, plans) + full Brain window (Brain access point redirects here) + **global Schedule** (all playgrounds) + Optimize, websites, and other previously-cut utility functions. Playgrounds tab quick-chat router with team-confirmation popup + manual override picker.
- **Session 35 — Customizable dashboards + menus.** Widget registry formalized (add/remove/reorder/persist, per-user for Overview, per-playground for playground dashboards); customizable playground inner menu with **Schedule as a standard item (per-playground scoped)**. Schema: layout JSON on `Playground` + a user-level dashboard config.
- **Session 36 — Team drill-down + agent editor.** `/playground/[id]/teams/[teamId]` agent detail: model/provider, skills allowlist, Brain doc grants, file access. Schema: per-agent capability records (skills allowlist, doc ACL join table).
- **Session 37 — Projects: model + isolated workspace.** `Project` model (name, slug, playgroundIds/teamIds by reference, brain namespace, folder path, status), Chat-tab Projects entry, project interface (dashboard / chat / files / schedule / settings) with project-scoped Brain namespace + dedicated folder.
- **Session 38 — Projects: shared work + clean teardown.** Multi-team shared files inside a project, coordinator orchestration across the project's teams, projectId labeling on tasks/chats/plans (and later deployments), Delete Project with full deletion preview + one-tap zero-residue teardown.

### Git facts still relevant (from Session 32 archaeology)

- Charcoal Design System v3 tokens in `app/globals.css` are correct — keep them; brand accent is blue-cyan `#38BDF8` via `--color-brand`.
- Rust `#D4715A` is hardcoded in 9 app/component files (landed in `404a125`) — must go, along with the rust asterisk logo.
- The liked pre-redesign sidebar is at `git show 5213954:components/Sidebar.tsx` — useful for visual language (spacing, pill tab box), but the structure now follows the Claude Desktop spec above, not the old four sections.

### Palette decision (owner, 2026-07-04)

- **Dark mode (default):** black/charcoal + greys with **blue accents** — the existing v3 charcoal tokens with the blue-cyan `--color-brand` are the right base; keep them.
- **Light mode (new):** white + greys with the **same blue accents** (use a darker blue variant where text contrast on white requires it). Implement as a parallel token set + toggle; dark stays default.
- **Logo:** pixel-art playground equipment (owner reference: pixel swing image, 2026-07-04) — professional, original, blue structure + neutral accents. Candidates presented for approval; wired into `components/Logo.tsx`, marketing page, and PWA icons once picked.

### Rules while doing it

- Claude Desktop feel: clean, minimal, generous whitespace. When choosing between adding and removing an element, remove.
- No emojis anywhere in the UI. No decorative icon noise.
- Every session ends with a passing Docker build.

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

- Reopen self-registration when there is a product to sell: set `REGISTRATION_OPEN=true` on the VPS (invite-code gate via CRON_SECRET applies on top); restore the "Create one" link on `/login`. Closed 2026-07-05 by owner request.
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
