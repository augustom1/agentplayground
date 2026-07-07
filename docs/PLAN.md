# docs/PLAN.md — Master Open Work List
> Updated: 2026-07-05 (RELEASE SPRINT declared — friends release by Friday 2026-07-10; §0 below overrides all other ordering until it ships)
> Source of truth for direction: `docs/VISION.md`. If anything here contradicts it, VISION wins.
> Session state: `HANDOFF.md` (root). Session history: `docs/SESSION-HISTORY.md`.
> Superseded plans live in `docs/archive/` (kept for history, do not follow them).

---

## 0. RELEASE SPRINT — friends release by Friday 2026-07-10 (OVERRIDES everything below)

**Owner decision 2026-07-05:** get as much done as possible by **Friday 2026-07-10**, send the app to
friends over the **July 11–12 weekend**, then start making content around it and pursuing first sales
(cold-calling businesses, services per `business/03-services-pricing.md`). Until the release ships,
every session serves this sprint — read this section first and ignore any other "next session" ordering.

**The bar:** the downloadable app must survive a stranger's first 15 minutes. Stability and first-run
experience beat new features all week. When in doubt: fix the install path, not the roadmap.

### Sprint sessions (Mon 7 → Fri 10, prompts in `docs/SESSION-PROMPTS.md`)

- ✅ **Session 35 — RELEASE GATE.** (done 2026-07-05) Fresh-install e2e test run twice from empty
  volumes — full wizard → chat → playground → router path works. Release-blocking bug fixed: wizard/
  Settings keys never reached agent runners (new `lib/api-keys.ts` resolver wired into delegated/
  runner/providers/team-chat/task routes). Marketing-page dead end on first run fixed (middleware).
  Empty states shipped (Overview widgets, playground teams, Plans). Image pushed:
  `augustojmd/agentplayground:0.1.0` + `:latest` (public). Release zip rebuilt (was stale since
  June 28 — build script's `zip` silently missing) + re-uploaded to GH release v0.1.0. Version/download
  chain verified 200. `docs/FEEDBACK.md` created. Fallout list for 36 in HANDOFF Session 35 notes.
- ✅ **Session 36 — First-run experience + demo seed.** (done 2026-07-06 — session crashed before
  docs/deploy wrap-up; reconstructed same evening) Fresh ANTHROPIC key verified 200 + NVIDIA key
  verified with a real completion (KEYS.md updated — owner pre-req CLOSED). Delegated/plan runners
  ported to the provider abstraction via new `lib/agents/provider-loop.ts` (anthropic → nvidia →
  ollama). Fallout fixes shipped: blank starter really blank (`lib/seed-defaults.ts`), Personal-pack
  teams assigned to playgrounds (`lib/seed-playgrounds.ts`), wizard key validation ping
  (`app/api/setup/validate-key/`), done-step copy. "Any model, any time": shared
  `lib/model-catalog.ts` + custom model id input in the main chat picker + new
  `components/ModelPicker.tsx` in the playground scoped chat. Demo seed (`lib/seed-demo.ts` wired
  into setup/complete). README + INSTALL final pass. Image rebuilt + re-pushed to Docker Hub
  (0.1.0 + latest, 2026-07-06 22:25); release zip re-uploaded (22:04, verified current). **Left
  hanging by the crash:** VPS scp deploy (ssh-verified: VPS still on Session 35 code), live browser
  verification of the ModelPicker, git commit — Session 37 does these first.
- **Session 37 — Session 36 wrap-up, then STRETCH: widget registry.** FIRST: finish what the
  Session 36 crash cut off — scp the Session 36 files to the VPS + rebuild (ssh-verified missing),
  confirm fresh keys in VPS Settings → API Keys, verify the ModelPicker + custom model input live
  in a browser, and git commit sessions 34–36. THEN the widget registry (the old Session 35 spec,
  §1 item 3/4 below) — only if nothing install-critical is open.
- **Session 38 — SHIP (Friday).** Clean-machine install rehearsal following INSTALL.md literally;
  blockers only, zero new features; final image tag + zip + `/api/version` changelog; write the
  friends announcement message for the owner to send; HANDOFF updated to the post-release phase.

### Owner tasks (not Claude sessions — do these during the week)

- [x] Docker Hub login available in the shell before Session 35 (`docker login`) — was already logged
      in as `augustojmd`; image pushed in Session 35
- [x] **Fresh `ANTHROPIC_API_KEY`** — DONE 2026-07-06 (Session 36): fresh key verified 200, NVIDIA
      key verified with a real completion; KEYS.md statuses updated. Confirm both keys are also set
      on the VPS (Settings → API Keys) during the Session 37 deploy
- [ ] Friends list + where they report problems (Telegram group?)
- [ ] Content plan sketch: which flows to record (task router, Overview hub, playground creation are
      the demoable moments); which channels
- [ ] Skim `business/03-services-pricing.md` and pick ONE niche offer for the first cold calls

### Deferred until after the release ships (do NOT start during the sprint)

- Per-agent editor (old Session 36 — spec stays in §1 item 5)
- Projects, both parts (old Sessions 37–38 — spec stays in §1 item 6). Until Projects exists, any
  client/demo work goes in its own playground with its own brainTags — never in shared areas
  (SensorGuard lesson).
- Everything in §3–§6

### After the release weekend

Sessions become feedback-driven: friends' bug reports first (docs/FEEDBACK.md), then content-support
work (demo polish, landing page), then **Meetings + Mission Control (§1 item 7 — owner priority
2026-07-06, Sessions 39–41)**, then the **VPS install path** (one session — see backlog: vps compose
overlay + install script; enables the $50 assisted-install side offer AND is the delivery tooling for
the flagship Private Server Deployment — move it up if a deployment client signs), then the deferred
UI sessions (agent editor, Projects), then §3–§6. Business model updated 2026-07-06 (private-server-
first, `business/03-services-pricing.md`): flagship = Private Server Deployment $1,000–2,000 one-time
+ composed monthly (passthrough + ~30% brokerage + maintenance + future per-app fees); no shared
hosting yet. Reopening self-registration (`REGISTRATION_OPEN=true`) is the owner's call once there's
something to sell.

---

## Build order (from VISION §5) — paused by §0 until the release ships

**UI restoration → repo cleanup → n8n MCP tools → self-service Telegram bots → permission rings → deployment capabilities.**

One concern per session where possible. Every session ends with a passing Docker build.

- ✅ Repo cleanup — DONE (Session 32)
- ✅ UI restoration core — Sessions 33–34 shipped (shell, theme, logo, Overview hub, task router)
- 🔜 **RELEASE SPRINT — see §0** (widget registry folded in as stretch; agent editor + Projects deferred)
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
7. **Meetings + Mission Control — live agent visibility** (owner request 2026-07-06, priority right after release + feedback fixes):
   The owner's picture: *"have meetings between agent teams and yourself, where you can see what they
   are planning and working on … like an open Cursor window where you see multiple agents working on
   the same project."* Two connected features:
   - **7a. Mission Control (live agent board):** a live view of everything currently running —
     one card per active agent/task streaming its current step in real time: which tool it's using,
     iteration count, last output snippet, files/Brain docs touched. Click a card → full live
     transcript of that agent's run. This is the "watch them work" surface; it complements the task
     router (dispatch without a meeting — already shipped) rather than replacing it.
     - **Build on what exists:** `lib/notify/sse.ts` (`planEventBus`, `notifyPlanEvent`) +
       `GET /api/notify/stream` already push TASK_STARTED/completed events to the chat activity
       strip. Extend the event vocabulary with step-level `AGENT_STEP` events (taskId, agentId,
       phase: thinking | tool_call | tool_result | output, summary, ts) emitted from the three run
       loops: `lib/agents/provider-loop.ts`, `lib/agents/runner.ts`, `lib/agents/delegated.ts`
       (and optionally the chat tool loop). Persist steps to an `AgentStep` table (or reuse the
       activity log) so the board shows recent history, not just what you happen to catch live.
     - **Surface:** new "Live" section in the Overview hub (same embedded-window pattern as
       Brain/Schedule) + a scoped version inside each playground (same scoping pattern as
       Brain/brainTags). SSE-driven, no polling.
   - **7b. Meetings (interactive council with a live room):** the user (or coordinator alone) calls
     a meeting with selected teams — e.g. "discuss this new business idea with Marketing + Research".
     A meeting room UI shows one live column/lane per participant; each round, every team head
     contributes (streamed as it generates), the Keeper facilitates and converges, and the user can
     interject at any time (their message joins the next round). Ends with a decisions list.
     - **Build on what exists:** `lib/council/index.ts` `runCouncil()` already does round-based
       team-lead debate + facilitator synthesis (fast/balanced/deep presets, Ollama or API). 
       Generalize it: stream per-participant output through the SSE bus (MEETING_TURN events),
       accept mid-meeting user injections, and make the output schema decisions/action-items
       instead of plan amendments.
     - **Meeting model:** topic, participantTeamIds, status, transcript (JSON turns), decisions,
       playgroundId?, userId. Meetings live under the playground (business meeting = playground
       teams) or global (coordinator + any teams).
     - **Decisions → work:** each decision gets a "Dispatch" action that feeds the existing
       route-task/delegate machinery; dispatched tasks immediately appear on the Mission Control
       board — meeting and board are two halves of one loop (decide → watch it get done).
     - **Brain:** transcript + decisions ingest to the Brain on meeting end (playground-tagged).
     - **Models:** each participant honors its team's provider/model; a per-participant ModelPicker
       override in the meeting setup ties into "any model, any time". The per-agent editor
       (item 5) later makes these defaults editable per agent.

- ✅ **Session 33 — Shell + home screen + theme.** (done 2026-07-04) New sidebar (tab pill **Chat | Playgrounds | Overview**; Chat tab gets Projects + Brain items — Projects can 404-stub until Session 37), centered home greeting + coordinator input, MobileNav update, purge the 9 rust `#D4715A` hardcodes → `--color-brand` tokens, wire in the new logo everywhere (app + marketing + PWA icons — the rust asterisk must not appear anywhere), **light mode**: white/grey token set with the same blue accent + theme toggle (dark stays default), centering pass.
- ✅ **Session 34 — Overview tab hub + coordinator router.** (done 2026-07-05) Overview rebuilt as the system hub — hash-synced section tabs Dashboard | Brain | Schedule | Optimize | Websites | Tools (owner confirmed the utilities list; Agent Lab excluded — Session 36 supersedes it; sections embed the existing pages). Dashboard widgets: tasks (total/active), playgrounds, teams, plans, recent completions. Task router shipped: `POST /api/route-task` (LLM team pick with reasoning + graceful manual fallback; background dispatch via `runDelegatedTask`) + `components/TaskRouter.tsx` popup (confirm/override via playground → team picker) wired into the sidebar Playgrounds tab + `/playgrounds`.
- **Customizable dashboards + menus** (⏸ STRETCH slot in the §0 sprint — Session 37 if the release gate is green). Widget registry formalized (add/remove/reorder/persist, per-user for Overview, per-playground for playground dashboards); customizable playground inner menu with **Schedule as a standard item (per-playground scoped)**. Schema: layout JSON on `Playground` + a user-level dashboard config.
- **Team drill-down + agent editor** (⏸ DEFERRED post-release — §0). `/playground/[id]/teams/[teamId]` agent detail: model/provider, skills allowlist, Brain doc grants, file access. Schema: per-agent capability records (skills allowlist, doc ACL join table).
- **Projects: model + isolated workspace** (⏸ DEFERRED post-release — §0). `Project` model (name, slug, playgroundIds/teamIds by reference, brain namespace, folder path, status), Chat-tab Projects entry, project interface (dashboard / chat / files / schedule / settings) with project-scoped Brain namespace + dedicated folder.
- **Projects: shared work + clean teardown** (⏸ DEFERRED post-release — §0). Multi-team shared files inside a project, coordinator orchestration across the project's teams, projectId labeling on tasks/chats/plans (and later deployments), Delete Project with full deletion preview + one-tap zero-residue teardown.
- **Session 39 — Mission Control part 1** (post-release, after feedback fixes — item 7a). `AGENT_STEP` SSE events emitted from provider-loop/runner/delegated, persisted step log, Live board section in the Overview hub (cards per active agent/task, expandable live transcript), playground-scoped variant.
- **Session 40 — Meetings part 1** (item 7b core). `Meeting` model + `runMeeting` generalization of `runCouncil` (streamed MEETING_TURN events, user interjection between rounds, decisions output) + meeting room UI (lane per participant, live streaming, topic + participant + model setup).
- **Session 41 — Meetings part 2** (item 7b close the loop). Decisions → dispatch through route-task/delegate machinery, dispatched tasks visible on the Mission Control board from inside the meeting, transcript + decisions → Brain ingest, meeting history list.

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

- **VPS install path (one session, post-Meetings — owner 2026-07-06):** `docker/docker-compose.vps.yml`
  overlay (Traefik + Let's Encrypt, real domain, registration closed) + `scripts/install-vps.sh`
  (asks domain + email, pulls the Hub image, brings the stack up) + VPS section in INSTALL.md +
  desktop-vs-server feature matrix on the marketing /download page. Same image as desktop — never a
  fork; profiles differ only in compose + env. Enables the $50 assisted-install offer and is the
  repeatable delivery tool for Private Server Deployments (`business/03-services-pricing.md`).
- **In-app server setup (v2 of the above, ties into §6):** Settings → Server page — enter domain +
  Let's Encrypt email in the open app; app writes Traefik file-provider config on a shared volume and
  re-resolves NEXTAUTH_URL at boot. Makes the $50 tier truly zero-support ("connect your domain, SSL
  and APIs once the app is open" — owner spec 2026-07-06).
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
