# HANDOFF.md — Session State
> Last updated: 2026-07-07 (Session 38: customizable sidebar + Store/Library + Redirect app — owner redirect, off-sprint)
> Read this FIRST at every session start, before CLAUDE.md.
> **Source of truth for direction: `docs/VISION.md`** — if anything here contradicts it, VISION wins.
> See `docs/PLAN.md` for the full open work list.
> See `docs/SESSION-HISTORY.md` for full session archive.

---

## ⏱ RELEASE SPRINT — friends release by FRIDAY 2026-07-10

**Owner decision 2026-07-05.** Friends get the downloadable app over the July 11–12 weekend; the owner
then starts making content around it and pursuing first sales. Until it ships, **`docs/PLAN.md` §0
overrides every other priority in this file** — sprint session prompts are in `docs/SESSION-PROMPTS.md`
(35 release gate → 36 first-run + demo seed → 37 stretch widget registry → 38 ship Friday).
The bar all week: *the downloadable app must survive a stranger's first 15 minutes.* Stability over
features; agent editor and Projects are deferred post-release.

---

## Current State — What's Live ✅

App is **healthy** at `https://app.agentplayground.net`

### Platform (all deployed)
- Teams, Agents, Skills, Chat (streaming, 25-iteration tool loop, 30 tools)
- 2nd Brain: vault, MCP endpoint, graph, semantic search, brain chunks + HNSW
- Plans system: create → council review → approve → dispatch → execute
- LLM Provider adapter system (`lib/providers/`) — extended thinking support added
- Admin panel (`/admin`): analytics, API monitor, credit management
- Playground Teams Hub (`/playground`): team chat, widget grid, live data
- Coordinator mode: full COORDINATOR_INTRO prompt, delegation wired, plans wired
- SSE activity strip: live agent task notifications in chat
- `request_human_input` tool: agents pause mid-task for user decisions
- Project status dashboard (`/projects`): workstream panels, task counts
- Telegram: bidirectional DMs → coordinator, group notifications, settings UI
- PWA: manifest, icons, installable
- Design System v4: charcoal `#1a1a1a` dark (default) + white/grey light mode, blue-cyan `--color-brand` `#38BDF8`, pixel-art playground logo (`components/Logo.tsx`) — rust `#D4715A` fully purged
- **Actions system**: PendingAction model, `/actions` page, create/dismiss/list tools
- **Personal OS pages**: `/cv`, `/learn`, `/notes` — Brain-indexed context, admin-only nav links
- **Nav gating**: `/overview`, `/notes`, `/cv`, `/learn`, `/connect` hidden for non-admin users
- **API Keys settings**: Users can set ANTHROPIC_API_KEY / OPENAI_API_KEY in Settings UI (stored in AgentMemory)
- **License model**: `licenses` table — plan, userEmail, key (UUID), expiresAt
- **Version endpoint**: `GET /api/version` — public, no auth — `{ version, downloadUrl, changelog }`
- **Admin Licenses**: `/admin/licenses` — create/revoke license keys
- **Admin system**: Seed Context, Index Docs, Overnight Knowledge Build
- **Local LLM flywheel**: task classifier → Ollama routing → Brain archive → protocol writer
- **Playgrounds**: Organizational containers grouping AgentTeams — sidebar section, CRUD API, `/spaces/[id]` dashboard (agents, active tasks, skills, recent completions)

### Session 35 addendum (2026-07-06) — NVIDIA free API provider ✅ (owner request)

**Users can now run the app 100% free two ways: Ollama (local) or NVIDIA's free API (cloud).**
NVIDIA NIM (`https://integrate.api.nvidia.com/v1`) is OpenAI-compatible; a free `nvapi-…` key comes
from build.nvidia.com (no credit card, ~40 req/min, 100+ models).

- **Chat:** `streamOpenAI` generalized with an `OpenAICompat` config — the `nvidia` provider reuses the
  full OpenAI tool loop against the NVIDIA base URL with `NVIDIA_API_KEY` (env → AgentMemory). Includes
  a retry-without-tools fallback (some NIM models reject the `tools` param) and NVIDIA-correct error
  mapping (**403 = invalid key** there, not 401 — verified live). Model picker: 4th provider tab with
  Llama 3.1 8B (default) / Qwen2.5 Coder 32B / Llama 3.3 70B / DeepSeek R1, all labeled free; cost
  display shows "free" for any `vendor/model` id. **Default is deliberately the small 8B** (owner call
  2026-07-06): faster and burns far fewer free-tier credits — the bigger models stay in the picker.
  `defaultModelFor(provider)` helper added in `lib/providers` and used by planner + council so the
  keeper/council fallback never requests a Claude model id from NVIDIA/Ollama (was hardcoded
  `claude-sonnet-4-6` — would have 404'd on the free fallback).
- **Wizard:** NVIDIA card (Cloud · Free) with key input + build.nvidia.com link; key state refactored to
  a map (`keys[providerId]`) so future providers are one array entry. `/api/setup/complete` stores
  `NVIDIA_API_KEY` and now also writes **DEFAULT_PROVIDER/DEFAULT_MODEL from the best key the user
  actually gave** (anthropic → openai → nvidia → ollama) — previously an OpenAI/NVIDIA-only user's
  first chat went to Anthropic and bounced.
- **Chat page loads that default on mount** (GET `/api/settings/provider-model`) — picker opens on the
  user's real provider, verified live (fresh NVIDIA-only install → picker shows "Llama 3.3 70B (free)").
- **Settings:** NVIDIA key field in API Keys (GET/POST extended), NVIDIA card in the provider grid
  (grid now 4-wide), NVIDIA option + models in Default Provider & Model.
- **Free-tier fallbacks in the machinery:** `route-task` pickProvider and `lib/providers` `getProvider`
  both try NVIDIA (via `OpenAIProvider` + baseUrl) after Anthropic and before Ollama/env defaults — the
  task router LLM pick and planner work on a free NVIDIA-only install.
- **INSTALL.md** now leads the "no key yet" line with the free NVIDIA option; `docker/.env.example` has
  an `NVIDIA_API_KEY=` line.
- Verified live on a fresh packaged install (wizard NVIDIA-only → Personal): wizard accepts nvapi key,
  chat hits `integrate.api.nvidia.com` (placeholder key → correct "invalid key → Settings → API Keys"
  message), Settings surfaces all render. **NOT verified: a real completion — needs a real nvapi key
  (owner: 2 min at build.nvidia.com, free, no credit card). Delegated/plan task runners are still
  Anthropic-SDK-only** — free-tier coverage for `lib/agents/delegated.ts`/`runner.ts` is the natural
  Session 36+ follow-up (port them to the provider abstraction).
- Builds green (`npm run build` ×3, docker build ×3 — the OneDrive `.next` readlink glitch recurred
  once; `Remove-Item .next` fixes it). Image re-pushed to Docker Hub (0.1.0 + latest), release zip
  rebuilt + re-uploaded (build-release.sh bsdtar path used), 11 app files scp'd to VPS + rebuild.

### Last Session (Session 38 — 2026-07-07) — Customizable sidebar + Store/Library + Redirect app ✅ (owner redirect, OFF-SPRINT)

**Owner redirected mid-sprint** to a batch of UX-customization work + a new downloadable-app/store
product line. This supersedes the planned "ship Friday" Session 38 checklist (that ship step is now
the next session's job — see Next Session). All work landed in the working tree; **not committed, not
deployed** (owner commits/deploys explicitly). `npm run build` ✅ green.

**Folder cleanup (owner ask #1):** Session 32 already did the big reorg, so residual only — removed
empty `docs/features/` + `docs/pivot/` (content already in `docs/archive/`), moved
`docs/n8n-*.md` → `docs/ops/` (infra how-tos), deleted stray gitignored `agentplayground-v0.1.0.zip`
at root. Left the `.env*` templates alone (gitignored local-only; `.env.template` referenced by settings page).

**Fully-customizable sidebar (owner asks: collapsible sections, custom shortcuts, Customize UI, more chat actions):**
- **`User.sidebarLayout Json?`** new column (additive/nullable — self-migrates via entrypoint `prisma db push`).
- **`lib/sidebar-registry.ts` NEW** — built-in Chat-tab items (`new-chat`, `create-meeting`, `brain`,
  `projects`), collapsible sections (`shortcuts`, `chat-with`, `recents`), `SidebarShortcut` shape,
  and `resolveSidebarLayout` (merges saved config with defaults; unknown ids dropped on read+write).
- **`GET/PATCH /api/settings/sidebar` NEW** — per-user layout, sanitized against the registry.
- **`components/Sidebar.tsx` reworked:** Chat tab renders from the saved layout. **"Chat with" and
  "Recents" are now collapsible** (persisted collapse state — fixes the "not collapsible / cluttered"
  complaint). **Custom agent shortcuts** render in a Shortcuts section (e.g. "Personal Trainer",
  "Company CEO" → `/chat?team=<id>`). **"Create a meeting"** item added (→ coordinator chat prefilled
  with a meeting request; uses the existing `schedule_meeting` tool). Hamburger got **Customize UI**
  + a **Store** link.
- **`components/CustomizeSidebar.tsx` NEW** — the Customize UI editor modal: show/hide + reorder items
  and sections, set sections collapsed-by-default, add/remove agent shortcuts (label + target team/Keeper).
- **`app/(app)/chat/page.tsx`:** added "Schedule a meeting" to the coordinator empty-state suggestions.

**Store / Playground Library + downloadable app SDK (owner ask #2):**
- **`app/(app)/store/page.tsx` NEW** (`/store`, linked in hamburger) — Apps + Playground Library
  sections from `lib/store-catalog.ts`, free vs paid vs "free on subscription", a "Build your own"
  card, and a crypto-purchase panel (deposit + email the receipt to `store@agentplayground.net`;
  points at Billing for wallet addresses). Catalog is static for now.
- **`downloads/playground-app-template/` NEW** — the free "make your own" folder: `README.md`
  (what an app is: page + optional API + optional model + Store entry; platform rules), `app.json`
  (manifest), `CLAUDE-PROMPT.md` (paste-into-Claude-Code prompt). Uses the Redirect app as the worked example.

**Redirect app (the concrete "webapp that redirects" the owner described) — REAL working feature:**
- **`RedirectLink` model** (code unique, url, label, clicks, active, userId).
- **`app/r/[code]/route.ts` NEW** — public 307 redirect (added `/r/` to `middleware.ts` isPublic);
  bumps click count fire-and-forget. Share `<origin>/r/<code>` → jumps to a Meet/call/video/page.
- **`app/(app)/apps/redirect/page.tsx` NEW** (`/apps/redirect`) — create/copy/enable/delete links.
- **`app/api/redirect-links/route.ts` + `[id]/route.ts` NEW** — auth+user-scoped CRUD, manual validation.

**Deferred / needs owner decision (documented, not built):** crypto payment *automation* + real
subscription entitlement gating (store is manual-fulfillment first cut); real per-app **subdomains**
(Traefik/DNS — YELLOW-ring infra, roadmap §4/§6); library **install** flow (POST /api/library/install
is still the 501 stub) and playground-scoped embedding of apps in the WORKSPACE menu.

### Previous Session (Session 37 — 2026-07-07) — Session 36 wrap-up + widget registry ✅

**Step 0 — Session 36 crash tail CLOSED:**
- **VPS deployed:** all 46 changed working-tree files pushed (tar-over-ssh, same scp-style file push) +
  dashboard rebuilt. Health 200, `✓ Ready`, no errors. VPS now runs Session 36 code.
- **Keys verified working with real chats in production:** "ANTHROPIC OK" on `claude-sonnet-4-6`
  (real token usage + cost shown) and "NVIDIA OK." on Llama 3.1 8B (free). Settings shows
  Anthropic + NVIDIA both "Set (via .env)" on the VPS. Owner pre-req fully closed.
- **Pickers verified live in a browser:** main chat picker (4 provider tabs, curated lists, custom
  model id input with Enter-to-apply), playground scoped chat ModelPicker (compact, opens upward);
  typed `claude-haiku-4-5-20251001` into the custom input → resolved to "Haiku 4.5" as active.
- **Git commit `48acaf2`** — sessions 34–36, 47 files (owner-approved). Secrets scan clean before commit.

**Widget registry (PLAN §1 items 3–4, sprint stretch) SHIPPED:**
- **Schema:** `User.dashboardLayout Json?` + `Playground.layout Json?` (`{ widgets: string[], menu: string[] }`).
  Additive nullable columns — entrypoint `prisma db push` migrates on container start (desktop installs
  self-migrate the same way).
- **`lib/widget-registry.ts` NEW** — single source of truth: `OVERVIEW_WIDGETS` (tasks, playgrounds,
  teams, plans, completions), `PLAYGROUND_WIDGETS` (agents, active-tasks, skills, completions),
  `PLAYGROUND_MENU_ITEMS` (chat, brain, schedule, plans, actions), defaults, and `sanitizeIds` /
  `resolvePlaygroundLayout` (unknown ids dropped on read AND write — stale configs survive registry changes).
- **`GET/PATCH /api/settings/dashboard` NEW** — per-user Overview layout on `User.dashboardLayout`.
  Playgrounds PATCH now accepts `layout` (server-side sanitized).
- **Overview Dashboard customizable (per-user):** widgets render from the saved layout; Customize →
  per-widget move up/down + remove, add-chips for hidden widgets, Done persists. Empty state handled.
- **Playground dashboard customizable (per-playground):** same pattern on the 4 panels, persisted in
  `Playground.layout.widgets` (menu echoed back so it isn't clobbered).
- **Playground WORKSPACE menu configurable:** inner sidebar renders from `layout.menu` (Dashboard and
  Settings fixed); **Schedule added as a standard item**.
- **`/playground/[id]/schedule` NEW — playground-scoped Schedule:** jobs filtered to the playground's
  teams (same scoping pattern as Brain/brainTags), upcoming + recent lists, create-job form with the
  team select limited to playground teams. Global schedule stays in Overview.
- **Playground Settings → "Workspace menu" section:** include/exclude + reorder the menu entries,
  saved with the rest of the settings.
- Builds: `npm run build` ✅ · VPS rebuild ✅ (see below) · schema push verified on VPS.
- **NOTE for Session 38:** the Docker Hub image (`augustojmd/agentplayground:0.1.0` + `latest`,
  pushed 2026-07-06 22:25) does NOT contain Session 37 widget-registry code — Friday's ship step
  must rebuild + re-push the image (and re-tag). Release zip unchanged (no docker/ changes).

### Previous Session (Session 36 — 2026-07-06) — First-run experience + demo seed ✅ (crashed pre-wrap-up)

**The session was lost mid-flight** (owner closed it accidentally while waiting on the docker build);
this block was reconstructed the same evening from the working tree, KEYS.md, Docker Hub, and file
timestamps. All code work landed and the image is built + pushed; the deploy/verify/docs tail was cut off.

**Done (verified from evidence):**
- **Keys (owner pre-req CLOSED):** fresh `ANTHROPIC_API_KEY` verified 200; `NVIDIA_API_KEY` verified
  with a real completion — both 2026-07-06, KEYS.md statuses updated (old Anthropic key marked EXPIRED).
- **Provider abstraction port:** new `lib/agents/provider-loop.ts` — `runProviderToolLoop()` runs the
  tool loop over `lib/providers` (anthropic → nvidia → ollama via `getAvailableProvider` +
  `defaultModelFor`, `request_human_input` interception, retry-without-tools degrade). Wired into
  `lib/agents/delegated.ts` + `lib/agents/runner.ts` — free-tier installs can now run delegated/plan
  background tasks.
- **"Any model, any time":** new shared `lib/model-catalog.ts` (4 providers, curated shortlists);
  main chat picker now uses it + has a custom model id input per provider; new
  `components/ModelPicker.tsx` (compact, opens upward, custom id input) wired into the playground
  scoped chat (`app/(app)/playground/[id]/chat/page.tsx`). This was the last thing edited (22:07).
- **Session 35 fallout fixes:** Blank starter really blank (`lib/seed-defaults.ts`), Personal-pack
  teams assigned to playgrounds (`lib/seed-playgrounds.ts`), wizard key validation ping (new
  `app/api/setup/validate-key/` + setup page wiring), done-step copy fixed.
- **Demo seed:** new `lib/seed-demo.ts` (2 welcome/example Brain docs + example scheduled job,
  idempotent) called from `/api/setup/complete`.
- **README.md + INSTALL.md final pass.**
- **Image rebuilt + pushed:** `augustojmd/agentplayground:0.1.0` + `:latest` built 22:16 and on
  Docker Hub as of 22:25 (2026-07-06) — the image contains ALL of the above (built after the last
  edit), and a successful docker build means the code compiles green.
- **Release zip re-uploaded:** GH release v0.1.0 asset updated 2026-07-06 22:04 (verified via gh) —
  the zip is the docker package + scripts; app code comes from the pushed Hub image, so friends
  pulling now get all Session 36 code. NOT stale.

**Left hanging by the crash (Session 37 step 0):**
- **VPS scp deploy of the Session 36 files + dashboard rebuild — verified via ssh 2026-07-06: the
  VPS has NONE of the new files (model-catalog, seed-demo, provider-loop, ModelPicker); it runs
  Session 35 code.** The hosted app works but lacks the runner port + pickers until deployed.
- Confirm fresh ANTHROPIC + NVIDIA keys are set in VPS Settings → API Keys.
- Live browser verification of the ModelPicker + custom model input (code compiled but never exercised).
- Git commit (sessions 34–36 all uncommitted in the working tree).

### Previous Session (Session 35 — 2026-07-05) — RELEASE GATE ✅

Sprint §0 Session 35 delivered. **The downloadable app is live:** `augustojmd/agentplayground:0.1.0`
+ `:latest` on Docker Hub (digest `sha256:d1ab3800…`, public — friends pull with no login), release zip
rebuilt and re-uploaded to GitHub release v0.1.0, `agentplayground.net/api/version` → `/download` →
GitHub asset chain verified 200 end-to-end.

- **Fresh-install e2e test run TWICE from empty volumes** (docker/ package, real browser at
  `http://127.0.0.1:3000` for a clean cookie jar — localhost carries dev cookies that mask first-run
  behavior). Pass 1: Anthropic key + Personal starter. Pass 2: Ollama-only + Blank starter. Full path
  worked both times: wizard 5 steps → account + auto sign-in → key stored → teams/playgrounds seeded →
  chat (graceful key error) → manual playground create → Quick task router (manual fallback → team →
  dispatch) → Overview widgets pick everything up.
- **RELEASE-BLOCKING BUG found + fixed — wizard/Settings API keys never reached the agent runners.**
  `lib/agents/delegated.ts`, `lib/agents/runner.ts`, `lib/providers/index.ts` (`getProvider` fallback),
  playground team chat (`app/api/playground/teams/[id]/threads/[threadId]/messages/route.ts`) and
  `app/api/task/route.ts` all read `process.env.ANTHROPIC_API_KEY` only. Desktop installs have no env
  key — every delegated task, plan task, and playground team chat failed with "No API key" even with a
  valid wizard key. New `lib/api-keys.ts` → `getEffectiveApiKey()` (env truthy-check → AgentMemory)
  wired into all five call sites. Chat + route-task already had their own fallbacks (unchanged).
- **First-screen bug fixed:** fresh install opened the marketing homepage ("Download Free" + dead-end
  Sign in — registration is closed). `middleware.ts` now runs the zero-users check on `/` and `/login`
  and redirects to `/setup`. Verified: `curl /` on fresh DB → 307 `/setup`.
- **Playground assistant failure mode fixed:** generic "Something went wrong" → now says the AI provider
  is the problem (Settings > API Keys) and points to manual create (Playgrounds tab → New playground).
- **Empty states (first-run) shipped:** Overview widgets Tasks/Playgrounds/Teams/Plans/Completions each
  say what the thing is + exactly one action link; playground dashboard "no teams" panel got an
  **Add teams** button → `/playground/[id]/settings`; Plans page empty copy explains the approve flow.
  Brain (folder-structure onboarding) and Schedule (calendar + Add Job) were already good — untouched.
- **Emoji purge in messages:** chat route stream errors (⚠️/❌ removed), chat page + files page error
  prefixes, assistant 🚀 icon fallback → null; Settings provider badge "Active" → "Available" (was
  claiming all three providers active regardless of keys/Ollama reality).
- **Release zip was stale on GitHub since June 28** — `docker/build-release.sh` uses `zip`, which
  doesn't exist in Git Bash; the script silently kept the old archive. Fixed (bsdtar fallback + hard
  fail), rebuilt, uploaded with `--clobber` (asset now 5664 bytes, updated 2026-07-06). INSTALL.md help
  line now says "message the person who sent you this" (was a nonexistent GitHub org issue link).
- **docs/FEEDBACK.md created** — friends bug-report inbox with template; post-release sessions read it
  FIRST and fix reported bugs before roadmap work.
- Builds: `npm run build` ✅ (once after `.next` cache purge — OneDrive readlink glitch) ·
  `docker build` ✅ · deployed 18 files via scp → VPS dashboard rebuild.
- **NOT verified: a successful first chat with a VALID key.** The only Anthropic key anywhere (env,
  docker/.env.local, KEYS.md — which wrongly says ACTIVE) is expired/invalid. Owner pre-req from the
  sprint list is still open: put a fresh key in Settings → API Keys (VPS) and re-test one chat +
  one dispatched task locally before Friday.
- **Session 36 notes (fallout list):** (1) Blank starter isn't blank — `seedDefaults()` still creates
  File Manager/Database Agent teams + 3 empty playgrounds, so the router picker dead-ends ("This
  playground has no teams assigned." — handled, but a dead end); (2) Personal-pack teams (Fitness &
  Health, Job Search…) aren't assigned to any playground → unreachable via the router's manual picker;
  (3) wizard accepts an invalid key silently — friend finds out at first chat (consider a cheap
  validation ping); (4) wizard done-step says "teams are being seeded" even for Blank; (5) router
  silently falls back to manual picker on LLM failure — fine, but consider a one-line notice.

### Previous Session (Session 34 — 2026-07-05) — Overview Hub + Coordinator Task Router ✅

PLAN §1 Session 34 delivered:

- **`app/(app)/overview/page.tsx` rebuilt as the system hub:** section tab bar **Dashboard | Brain | Schedule | Optimize | Websites | Tools** synced to the URL hash (`/overview#brain` etc. — the sidebar Brain item lands on the Brain section). Owner confirmed the utilities list (Optimize, Websites, Tools as **embedded windows**; Agent Lab excluded — superseded by the Session 36 per-agent editor). Sections embed the existing pages directly (`files`, `schedule`, `optimize`, `websites`, `tools` page components imported into the hub — zero duplication; the standalone routes still work).
- **Dashboard section widgets (static layout):** Tasks (total + active stat numbers + active list), Playgrounds (neutral icons — removed the leftover `🎯` emoji fallback), Teams (new — non-system teams with agent counts, rows link to `/chat?team=`), Plans, Recent Completions. Removed Quick Chat + Brain-summary widgets (Brain is a full section now; remove rather than add). Also fixed a leftover rust `rgba(212,113,90,…)` in the RUNNING plan badge → `var(--color-brand-dim)`.
- **`app/api/route-task/route.ts` NEW — coordinator task router API:** route mode (`POST {description}`) fetches non-system teams and asks an LLM to pick `{teamId, title, reasoning}` (Anthropic key env→AgentMemory first, DB-configured keeper provider incl. Ollama as fallback; degrades to `teamId: null` → manual picker when no LLM reachable). Dispatch mode (`POST {description, title, teamId, dispatch: true}`) creates the Task + activity log + `TASK_STARTED` SSE event, then runs `runDelegatedTask` **in the background** (same lifecycle as `toolDelegateToTeam`: blocked/completed/failed statuses, Brain ingest, Telegram notifications) and returns the taskId immediately.
- **`components/TaskRouter.tsx` NEW — router popup:** describe task → routing → confirmation card (pick + reasoning, "Dispatch to X" / "Change team") → or override via playground list → team picker (filtered to the playground's `teamIds`) → dispatching → done. Wired into the Sidebar Playgrounds tab (**Quick task** button replaces the Session 33 link stub) and into `/playgrounds` (button in header — mobile tab destination).
- **Bug found + fixed during verification:** same-page hash links don't fire `hashchange` (Next Link uses `pushState`) — clicking sidebar Brain while already on `/overview` updated the URL but not the section. Sidebar Brain link now forces `window.location.hash` on same-page clicks.
- **Verified live in the browser (production, logged-in session):** all six hub sections render embedded; `#brain` anchor works from both cross-page and same-page entry; router full flow exercised — LLM routing gracefully fell back to the manual picker (expired VPS key, see standing items), override flow dispatched a smoke-test task to Marketing Team, task row created, background runner failed gracefully (expired key) with status `failed`, no unhandledRejection. Dashboard Tasks widget picked the task up (1 total).
- Builds: `npm run build` ✅ · `docker compose build dashboard` ✅ · deployed via scp (2 rounds: 5 files + Sidebar fix), container healthy, health 200.
- Noticed during verification: **files.agentplayground.net shows DOWN** in the Websites monitor (pre-existing infra, not this deploy). The Brain vault shows 0 notes at root ("Knowledge Base 0") — folders exist; the 48 indexed docs live in brain chunks, not vault notes.
- Not committed to git — owner asks for commits explicitly; working tree holds Session 34 changes.

### Previous Session (Session 33 — 2026-07-04) — UI v4 Shell + Theme + Logo ✅

PLAN §1 Session 33 delivered — the Claude Desktop shell:

- **`components/Sidebar.tsx` rebuilt:** top tab pill **Chat | Playgrounds | Overview** (synced to route; Overview tab click navigates to `/overview`).
  - **Chat tab:** New chat, Projects stub ("Soon" tag, real in Session 37), Brain item → `/overview#brain`, "Chat with" picker (Playground Keeper → `/chat?team=coordinator`, team heads → `/chat?team=<id>`), Recents (GET `/api/conversations`, non-empty only → `/chat?c=<id>`).
  - **Playgrounds tab:** Quick task entry (→ coordinator chat; real router popup comes in Session 34) + playground list (neutral icons — no emoji rendering) + create panel (kept, emojis/rust removed).
  - **Overview tab:** link to `/overview`. Collapsed mode: three icon links.
- **`app/(app)/playgrounds/page.tsx` NEW:** playgrounds-and-nothing-else grid (VISION §2.1) + inline name-only create; destination for the mobile Playgrounds tab and collapsed sidebar.
- **`app/(app)/chat/page.tsx`:** now reads `?team=` (chat-with picker) and `?c=` (open conversation from Recents) via `useSearchParams` (page wrapped in Suspense); emoji cleanup (calendar icon, voice prefix, chips); home screen was already the centered greeting + coordinator input from earlier work — kept.
- **`components/MobileNav.tsx`:** same three tabs Chat | Playgrounds | Overview (temporary `/overview` patch gone); More sheet trimmed to Brain/Schedule/Plans/Settings (+Users for admin).
- **Rust purge complete — 0 occurrences left in code:** `app/page.tsx`, `download/page.tsx`, `setup/page.tsx` (brand tokens), `SystemFlowDiagram.tsx`, `notes/page.tsx` (brand hex for alpha-suffix styles), playground settings placeholder, seed-skills prompt text, `globals.css` header comment, **`webroot/ar/index.html`** (asterisk favicon/nav/footer → pixel logo, accent → `#38BDF8`).
- **Pixel-art logo everywhere:** `components/Logo.tsx` (was already updated, now deployed), `public/icons/icon.svg` rewritten, **PWA PNGs regenerated** (icon-512/192 maskable-safe, apple-touch-icon, favicon-32) from the 32×32 pixel grid via scratchpad script. The rust asterisk no longer exists anywhere.
- **Light mode shipped:** token set + `ThemeProvider` + pre-paint script already existed; added **`components/ThemeSection.tsx`** — Appearance card in Settings (Dark default / Light). Toggle also remains in the sidebar hamburger.
- **Centering pass:** added `mx-auto w-full` to main containers in settings, schedule, actions, billing, connect, cv, learn, notes, projects, tools, users.
- **`middleware.ts` fix found during verification:** `/icons/*` and `/manifest.webmanifest` were auth-gated (redirected to login) — PWA icons/manifest were broken for logged-out visitors. Added both to `isPublic`.
- **Registration hard-closed (owner request 2026-07-05):** `REGISTRATION_OPEN` env master switch — unset (default) = `/api/auth/register` returns 403 and `/register` renders a "Registration closed" card (form split into `app/(auth)/register/RegisterForm.tsx`, shown only when open). Invite-code gate (CRON_SECRET) still applies on top when reopened. "Create one" link removed from login. Reopen when selling: set `REGISTRATION_OPEN=true` on the VPS. Owner creates accounts via `/users` (admin) meanwhile.
- **Post-review papercut fixes:** sidebar New chat → `/chat?new=1` (actually starts a fresh conversation; plain `/chat` resumed the session one), PWA `start_url` → `/chat` (installed app opens the app, not marketing), logged-in redirects `/dashboard` → `/chat` everywhere (marketing root, middleware `/login`, login callbackUrl, register auto-signin) — chat greeting is the home now.
- Builds: `npm run build` ✅ · docker compose build ✅ · deployed via scp; verified live: app health 200, marketing serves `var(--color-brand)` (0 rust), AR site blue, icon.svg + manifest public (were auth-gated — PWA install was broken in prod until this fix), `/register` shows closed card, register API 403.
- Not committed to git — owner asks for commits explicitly; working tree holds Session 33 changes.

### Previous Session (Session 32 — 2026-07-02) — Repo Cleanup + Plan Realignment ✅

**Direction change:** `docs/VISION.md` (moved from root `AGENT_PLAYGROUND_VISION_2-7.md`) is now the
source of truth. Priority order: **UI restoration → n8n MCP tools → Telegram bots → permission rings →
deployment capabilities.** The owner dislikes the current UI (Session 28+ redesign) — restoring the
pre-redesign feel in a 4-section layout is the next session, fully specced in `docs/PLAN.md` §1.

- **Build fix:** removed committed slug conflicts left by a failed revert — deleted
  `app/(app)/playground/[teamId]/`, `app/(app)/playground/page.tsx`,
  `app/api/playground/teams/[teamId]/widget-data/`. HEAD previously had `[id]` + `[teamId]` + `page.tsx`
  coexisting → Next.js build crashed. `npm run build` passes again.
- **`components/MobileNav.tsx`:** `/playground` tab (now a 404) temporarily points to `/overview`
  until the UI restoration rebuilds nav.
- **Repo reorganization (VISION §3):** 12 stale root .md files + `docs/pivot/` + `docs/features/` +
  6 stale docs specs + old website folder → `docs/archive/`; infra how-tos (Cloudflare, deployment,
  Traefik SSL, VPS) → `docs/ops/`; `add-site.sh`/`backup-db.sh`/`setup.sh` → `scripts/`;
  `claude_desktop_reference.png` → `docs/assets/`; release zip gitignored.
  Code-referenced paths untouched (docs/PLAN.md, docs/PROTOCOLS.md, docs/architecture.md,
  docs/DEPLOY-PROTOCOL.md, docs/context/, docs/BLOGPOSTS.md, entrypoint scripts, KEYS.md).
- **`docs/PLAN.md`:** full rewrite — new build order, detailed UI-restoration spec (incl. git
  archaeology: liked UI at commit `5213954`, disliked redesign in `404a125`), n8n/Telegram/rings/
  deployment stages, cross-cutting requirements, backlog.
- **`business/` docs updated to VISION §1 model:** open source core; custom playgrounds $350–500;
  full installs $1,000–1,500; hosting ~$100 / ~$180–200 / ~$250–300 per month; Playground Library.
  Rewrote `business/CLAUDE.md`, `00-overview.md`, `03-services-pricing.md`, `07-future-roadmap.md`;
  historical banner added to the other 9 business files. AR site = lead-gen, no MercadoPago checkout.
- **`CLAUDE.md`:** new read order (HANDOFF → docs/VISION.md → docs/PLAN.md), repo structure map,
  no-emoji + LLM-routing constraints added.
- **`docs/WALKTHROUGH.md`:** new plain-language guide to the entire codebase (folder map, chat/tool/
  agent/Brain flows, DB models, how agents make changes, deploy, current goals) — written so agents
  can read it from the Brain and derive work from it.
- **Brain indexing expanded:** `index-docs` route + setup background indexer now include
  `docs/VISION.md`, `docs/WALKTHROUGH.md`, `docs/ops/`, and the whole `business/` folder;
  Dockerfile copies `business/` into the runtime image so production indexing sees it.
- **Everything synced:** GitHub `augustom1/agentplayground` pushed (3 commits); VPS `/root/opt/vps/`
  mirrored to the new structure (stale files parked in `.trash-2026-07-02/` on the VPS, delete when
  comfortable); `--no-cache` rebuild; health 200; **48 docs indexed into the Brain, 0 errors**
  (`POST /api/admin/index-docs` with CRON_SECRET bearer).
- **Production auth fix:** `/api/auth/session` was returning 500 `UntrustedHost` (NextAuth v5 behind
  Traefik). Added `AUTH_TRUST_HOST=true` to VPS `.env.local` (same fix the desktop package got in
  Session 25), recreated container → session endpoint 200. Not caused by this deploy — the env var
  was simply missing on the VPS.

### Previous Session (Session 31 — 2026-06-29) — Overview Dashboard + AR Rebuild ✅ Phase 2 Session 10 COMPLETE

- **`app/(app)/overview/page.tsx`**: Full widget dashboard — 6 widgets: Active Tasks (running/pending), Playgrounds Quick-Launch (cards → /playground/[id]), Recent Completions, Plans Status (with status badges), Brain Summary (doc count + last indexed + link), Quick Chat (input → /chat?q=... launcher)
- **`app/(app)/playground/[id]/layout.tsx`**: Added Plans (ListTodo → /plans) and Actions (Zap → /actions) to WORKSPACE section
- **`components/ProviderModelSection.tsx`** + **`app/api/settings/provider-model/route.ts`**: Default Provider/Model selector in Settings — radio buttons (Anthropic/OpenAI/Ollama), model dropdown, saves to AgentMemory DEFAULT_PROVIDER/DEFAULT_MODEL
- **`app/api/chat/route.ts`**: Reads DEFAULT_PROVIDER/DEFAULT_MODEL from AgentMemory when request doesn't specify provider/model
- **`app/(app)/chat/page.tsx`**: Reads `?q=` query param on load and pre-fills input (used by Overview Quick Chat)
- **`webroot/ar/index.html`**: Full rebuild — lead-gen page, no prices, chatbot widget, 4-step process, FAQ, contact section; accent changed from blue to rust #D4715A; rust asterisk logo
- **`app/api/public/ar-chat/route.ts`**: New public endpoint — in-memory rate limit (20/hr/IP), CORS headers, system prompt for Argentine sales assistant, uses haiku/gpt-4o-mini
- **`middleware.ts`**: Added `/api/public/` to public routes (no auth required)
- **Deploy**: SCP 10 files → rebuild dashboard → health 200 ✅
- **GitHub**: Committed 42 files (sessions 22–31) + pushed to augustom1/agentplayground ✅
- **Phase 2 COMPLETE** — Docker push pending (need Docker Desktop running)

### Previous Session (Session 30 — 2026-06-29) — Playground Creation Assistant ✅ Phase 2 Session 9

- **`app/api/playground-assistant/route.ts`**: New non-streaming API endpoint for the playground creation chat. Auth-gated. 3 inline tools: `list_teams` (returns existing teams), `suggest_playground_config` (sub-LLM call to generate config JSON), `create_playground_from_config` (creates new teams if needed + playground). `confirmedConfig` shortcut skips LLM for creation step. Tool loop runs up to 6 iterations.
- **`components/Sidebar.tsx`**: Replaced old form modal with a right-side slide-in chat panel. 4-state machine: `chatting` → `proposing` → `creating` → `done`. Opens with greeting message. User describes intent → assistant proposes config card (name, icon, teams, brain tags) → "Looks good" creates instantly → "Open Playground" navigates. Input box in chatting/proposing states. Auto-scrolls. Panel is 440px wide with backdrop.
- **`app/api/library/install/route.ts`**: New stub endpoint (501 "coming in Phase 3") for importing playground packages.
- **`app/(app)/playground/[id]/settings/page.tsx`**: Added "Import" section with file picker (.zip) → `POST /api/library/install` → shows toast on success/error. Import section placed before Delete.
- **Deploy**: SCP 4 files → rebuild dashboard → health check ✅

### Previous Session (Session 29 — 2026-06-28) — Playground Environment ✅ Phase 2 Session 8

- **`prisma/schema.prisma`**: Added `brainTags String[] @default([])` to `Playground` model; `npx prisma db push` run on VPS
- **`app/(app)/playground/[id]/layout.tsx`**: New playground inner sidebar — 200px panel with playground name/icon, WORKSPACE section (Dashboard/Chat/Brain links), collapsible TEAMS section (filtered to playground's teams), collapsible APPS section (disabled "Coming soon"), Settings link at bottom
- **`app/(app)/playground/[id]/chat/page.tsx`**: Scoped chat — pre-filtered team picker (only playground teams + coordinator), `systemContext` injected with playground name + team list, empty state shows "Add teams in Settings" when no teams assigned
- **`app/(app)/playground/[id]/brain/page.tsx`**: Scoped Brain — fetches notes tagged with playground's `brainTags` (deduped across all tags), "Add to Brain" modal ingests with playground tags auto-applied, empty states for no-tags and no-docs
- **`app/(app)/playground/[id]/settings/page.tsx`**: Playground settings — name/icon/color editing, team multi-select, comma-separated brain tags input, PATCH to `/api/playgrounds/[id]`, delete with confirm
- **`lib/seed-playgrounds.ts`**: New `seedDefaultPlaygrounds(userId)` — creates 3 default playgrounds (Development 💻/Research 🔬/Business 💼) if user has 0; matches existing teams by name keywords
- **`app/api/playgrounds/route.ts`**: GET now auto-seeds defaults if list is empty; POST accepts `brainTags`
- **`app/api/playgrounds/[id]/route.ts`**: PATCH now accepts `brainTags`
- **`app/api/setup/complete/route.ts`**: Calls `seedDefaultPlaygrounds()` after team seeding in wizard flow
- **Deploy**: SCP all files → docker cp schema → db push (brainTags added) → rebuild → health 200 ✅

### Previous Session (Session 28 — 2026-06-28) — Navigation Restructure ✅ Phase 2 Session 7

- **`components/Logo.tsx`**: Unified to single `LogoMark` component — rust asterisk (#D4715A), 3 lines crossing at 60° each, replaces BrainNetwork SVG; exports `LogoMark({ size, color? })` and `LogoFull({ size, color? })`
- **`components/Sidebar.tsx`**: Full rewrite — removed 3-tab pill box (Chat/Teams/Brain), removed recents, removed pending actions badge; new structure: logo row → New Chat → SECTION: Main (Chat + Overview) → SECTION: Playgrounds; hamburger now has Settings + Admin (admin) + Users (admin), no Billing; playground links updated to `/playground/[id]`
- **`app/(app)/playground/[id]/page.tsx`**: New file — content moved from `/spaces/[id]`; delete-playground now redirects to `/chat` not `/dashboard`
- **Deleted**: `app/(app)/playground/page.tsx` and `app/(app)/playground/[teamId]/page.tsx` (old agent teams hub)
- **`app/(app)/overview/page.tsx`**: Replaced "How It Works" diagram with simple stub ("Coming in Session 10")
- **`app/(app)/chat/page.tsx`**: Empty state now shows "What would you like to work on today?" subtitle; fetches `/api/playgrounds` and shows up to 3 as navigation chips; falls back to hardcoded suggestions if no playgrounds
- **`app/page.tsx`** + **`app/(marketing)/layout.tsx`**: Replaced inline Logo SVG functions with imported `LogoMark` from `@/components/Logo`
- **Deploy**: SCP all 7 files → `--no-cache` rebuild → container up ✅ health 200 ✅

### Previous Session (Session 27 — 2026-06-28) — Polish + GitHub Release Prep ✅ Phase 1 Complete

- **`docker/start.sh` + `docker/start.bat`**: Removed exit-1 on first run; auto-generate AUTH_SECRET if placeholder; health-check polling loop (up to 120s) instead of fixed `sleep 10` — much better first-run UX
- **`docker/.env.example`**: Clarified API keys are optional in file (wizard handles them)
- **`INSTALL.md`**: Simplified to 3-step flow — Docker, extract, run start.bat
- **`app/api/chat/route.ts`**: Fixed invalid-key error messages to say "Go to Settings → API Keys" instead of `.env.local`; fixed "key not set" messages same way
- **`app/(auth)/setup/page.tsx`**: Changed default starter from "business" → "personal" (more relatable for first users)
- **`app/(app)/settings/page.tsx`**: OpenAI fixed from "Coming soon" → active with "GPT-4o, GPT-4o mini"; subtitle changed from ".env.local" to "Manage your API keys"; added prisma DB key check so "Missing required configuration" banner no longer false-alarms for wizard users; updated Quick Links to API key sources + Ollama download
- **`app/api/version/route.ts`**: Updated `downloadUrl` to `https://agentplayground.net/download` and `changelog` to proper text
- **`docker/build-release.sh`**: New script — builds `agentplayground-v0.1.0.zip` release package
- **`README.md`**: Rewritten as desktop-app public GitHub readme (hero, features, quick start, license)
- **Deploy**: SCP 4 changed app files → rebuild dashboard → verified ✅
  - `https://app.agentplayground.net/api/health` → 200 ✅
  - `https://agentplayground.net/api/version` → `{ "version": "0.1.0", "downloadUrl": "https://agentplayground.net/download", ... }` ✅

### Previous Session (Session 26 — 2026-06-28) — Marketing Website agentplayground.net

- **`app/page.tsx`**: Replaced dashboard redirect with marketing homepage — hero, 3 features, how-it-works, footer CTA, header + footer with rust asterisk logo
- **`app/(marketing)/layout.tsx`**: Marketing layout shell (header + footer) for all `/` group routes
- **`app/(marketing)/download/page.tsx`**: Download page — version badge (fetched from `/api/version`), download card, requirements, 5-step install, API key guide
- **`middleware.ts`**: Added `/`, `/download`, `/api/version`, `/llms.txt`, `/robots.txt`, `/sitemap.xml` to `isPublic` (no auth redirect)
- **`public/llms.txt`** + **`public/robots.txt`**: SEO files
- **`app/sitemap.ts`**: Returns sitemap for `/` and `/download`
- **`docker-compose.prod.yml`**: Added `marketing` + `marketing-http` Traefik routers on dashboard container for `agentplayground.net` + `www.agentplayground.net`; removed conflicting root-domain labels from nginx service
- **Deploy**: SCP all files → `docker compose up -d --build dashboard` → verified ✅
- **Tested live**:
  - `https://agentplayground.net` → HTTP 200 (marketing homepage) ✅
  - `https://agentplayground.net/download` → HTTP 200 (download page with v0.1.0 badge) ✅
  - `https://agentplayground.net/sitemap.xml` → XML sitemap ✅
  - `https://agentplayground.net/llms.txt` → HTTP 200 ✅
  - `https://agentplayground.net/robots.txt` → HTTP 200 ✅
  - `https://app.agentplayground.net/api/health` → HTTP 200 (app still works) ✅

### Previous Session (Session 25 — 2026-06-27) — Docker Packaging + End-to-End Test

- **`docker/docker-compose.yml`**: Core stack — `agentplayground/app:latest` + `pgvector/pgvector:pg16` + `redis:7-alpine`; `AUTH_TRUST_HOST=true` added (NextAuth v5 requires this for localhost); named volumes for data persistence
- **`docker/docker-compose.ollama.yml`**: Optional overlay — `ollama/ollama` + sets `OLLAMA_BASE_URL`; user adds with `--file` flag if they want local AI
- **`docker/.env.example`**: Template with `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `NEXTAUTH_URL`; Ollama comment included
- **`docker/start.bat` + `docker/stop.bat`**: Windows launch scripts; first-run copies `.env.example` → `.env.local`, prompts user to add key, then opens browser
- **`docker/start.sh` + `docker/stop.sh`**: Mac/Linux equivalents; executable bit set in git index
- **`INSTALL.md`**: Root-level install guide — requirements, 6 steps, Ollama opt-in, stop instructions
- **Bug fixed**: Deleted stale `app/api/playground/teams/[teamId]/` directory — Next.js crashed on startup with slug conflict vs `[id]` at same depth (leftover from Session 16 that was never actually removed)
- **Bug fixed**: Switched postgres image from `postgres:16-alpine` → `pgvector/pgvector:pg16` (alpine doesn't ship the vector extension)
- **Bug fixed**: Added `AUTH_TRUST_HOST: "true"` to `docker-compose.yml` env — NextAuth v5 rejects `localhost` as untrusted host without this
- **End-to-end test**: Built image locally (`agentplayground/app:latest`, 457MB compressed), ran full stack, wizard appeared on fresh DB, created account, logged in, sent message to coordinator — all working ✅
- **Image NOT yet pushed to Docker Hub** — needs `docker push agentplayground/app:latest` when ready to publish

### Previous Session (Session 24 — 2026-06-27) — Playground Organizational Containers

- **`Playground` model**: Added to `prisma/schema.prisma` — `id, name, icon, color, teamIds[], userId` — relation on `User`; `@@map("playgrounds")`; `npx prisma db push` run on VPS
- **`GET/POST /api/playgrounds`**: List (auth-scoped to userId) + create playground
- **`GET/PATCH/DELETE /api/playgrounds/[id]`**: Full CRUD, all scoped to userId
- **Sidebar Playgrounds section**: Collapsible "Playgrounds" section below Recents; + button opens quick-create modal (name, emoji icon, team multi-select); lists all playgrounds as nav links to `/spaces/[id]`; collapsed view shows emoji icons
- **`/spaces/[id]` dashboard page**: 4-quadrant grid — Agents (with status dot), Active Tasks, Skills (tag pills), Recent Completions; inline edit (name + icon); delete with confirmation
- **URL note**: Used `/spaces/[id]` instead of `/playground/[id]` — the latter conflicts with existing `/playground/[teamId]` (same dynamic segment depth in Next.js); teams and agents fetched from existing APIs and filtered client-side by `teamIds`
- **Deploy**: SCP all new + modified files → `prisma db push` → `docker compose up --build` → 200 health check ✅

### Previous Session (Session 23 — 2026-06-27) — First-Run Setup Wizard

- **Middleware**: Switched to `runtime = "nodejs"`, added Prisma import for user-count check; setup_complete cookie logic — no cookie → count users → if 0 redirect to /setup, else stamp cookie and continue
- **`/api/setup/create-account`**: New public POST — validates 0 users exist, creates admin with `role=admin plan=pro`, creates UserCredits (5000 balance)
- **`/api/setup/complete`**: New auth-required POST — saves OPENAI_API_KEY / ANTHROPIC_API_KEY to AgentMemory, seeds teams based on starterPack (personal/business/development/blank), sets `setup_complete` cookie in response
- **`/setup` page**: Replaced old 4-step wizard with new 5-step wizard: Welcome → API Keys (3 provider cards, multi-select) → Create Account (auto sign-in after) → Choose Starter (4 packs) → Done (summary + launch button)
- **`/api/setup` added to isPublic** in middleware — these routes are self-secured within the handlers
- Build: passes clean, all new routes appear as `ƒ` (dynamic)

### Previous Session (Session 22 — 2026-06-26) — Desktop App Session 1
- **Nav gating**: `/overview`, `/notes`, `/cv`, `/learn`, `/connect` hidden from non-admin users in Sidebar + MobileNav
- **API Keys settings**: `UserApiKeysSection` component + `GET/POST /api/settings/api-keys` → stores keys in AgentMemory (ownerType=system)
- **Chat route**: Falls back to AgentMemory for ANTHROPIC_API_KEY + OPENAI_API_KEY when env vars not set
- **License model**: Added to `prisma/schema.prisma`, table created on VPS (`licenses`)
- **Version endpoint**: `GET /api/version` → `{ version, downloadUrl, changelog }` — no auth required
- **Admin Licenses page**: `/admin/licenses` — list, create (auto-UUID key), revoke. API at `/api/admin/licenses`
- **AdminSidebar**: Added Licenses nav item with Key icon
- Deploy: SCP + no-cache rebuild + db push (docker cp schema workaround needed — cached layer issue)

### Session 21 (2026-06-25) — SensorGuard Cleanup
- Cleaned up `feature/sensorguard-demo` branch and merged to master
- Deleted: `app/api/sensorguard/`, `lib/sensorguard-demo.ts`, `web-empresa-sensorguard/`, `webroot/sensorguard/`, `webroot/guardtech/`, `sites/sensorguard.conf`, `sites/guardtech.conf`
- Removed GuardTech/SensorGuard Traefik labels from `docker-compose.prod.yml`
- Removed sensorguard volume mount from `docker-compose.yml`
- Removed sensorguard auth bypass from `middleware.ts`
- Removed `edit_demo_file` tool from playground messages route
- VPS cleanup: removed guardtech.conf, webroot/guardtech/, webroot/sensorguard/, sensorguard.conf via SSH
- Rebuilt dashboard container with `--no-cache`
- Branch `feature/sensorguard-demo` deleted locally and remotely
- **Desktop app pivot begins** — see `docs/pivot/` for the 8-session plan

### Session 19 — 2026-06-08
- **DEPLOYED**: All sessions 17-18-19 changes (101 files) to VPS + container rebuilt
- Local LLM flywheel fully connected: runner.ts classifies → routes to Ollama (confidence ≥72%) → fallback to Claude → archive to Brain → evaluateAndWriteProtocol
- `delegated.ts`: delegated tasks archive to Brain + evaluate for local protocol
- `dispatch.ts`: plan completion generates Ollama report → docs/reports/plans/ + Brain
- Overnight: 3 new Ollama documentation tasks (local-llm-catalog, team-capabilities, workflow-patterns)
- `lib/providers/anthropic.ts`: extended thinking support (budget_tokens)
- SensorGuard API routes: playground-chat, seed-team, telegram
- `app/(app)/overview/page.tsx`: system flow overview page
- `components/SystemFlowDiagram.tsx`: visual flow diagram

---

## Next Session Priorities

### ✅ Session 38 committed + deployed (2026-07-07)

Commit `86a81eb` on master, pushed to GitHub (`agentplayground.git`). Deployed to VPS (tar-over-ssh
+ `--build` rebuild), container healthy, schema in sync (`User.sidebarLayout` + `RedirectLink`).
Verified: `/api/health` 200, `/r/<bad-code>` → 404 message (route live + public), `/store` → 307 login.
Owner testing in the browser — feedback captured below for the next session.

### 🔜 NEXT SESSION — Session 39: Team drill-down + agent management + Overview polish (OWNER FEEDBACK 2026-07-07)

Owner tested Session 38 live and reported (feedback batched, to be built next session — not fixed live):

1. **BUG — playground team drill-down 404s (crash).** `app/(app)/playground/[id]/layout.tsx:189`
   links each TEAMS item to `/playground/[id]/team/[teamId]`, but **that route doesn't exist**
   (only brain/chat/schedule/settings under `playground/[id]/`). Clicking Dev Core → hard 404.
   The fix IS the deferred team drill-down page (PLAN §1 item 5, now pulled forward).
   *Stopgap available on request:* point the team link at the scoped chat until the page exists.
2. **Build the team drill-down page** `app/(app)/playground/[id]/team/[teamId]/page.tsx` — list the
   team's agents (data already flows: layout shows 7 agents w/ roles). Owner wants a **better,
   more customizable interface — use the `ui-ux-pro-max` skill** to design it.
3. **Agent popup (owner's core ask):** clicking an agent opens a window showing its **preferred /
   required model**. Mechanism: `Agent.model` already exists (default `claude-sonnet-4-6`). The
   coordinator can set an agent's *required* model; if unspecified, the agent uses the predetermined
   default. Popup shows + edits this via `PATCH /api/agents/[id]` (model catalog picker — reuse
   `components/ModelPicker.tsx` / `lib/model-catalog.ts`). Add a coordinator chat tool to set an
   agent's required model ("the coordinator tells them which model to use"). Goal: make agents
   accessible + easy to manage.
4. **"Create a team" button (owner ask):** playground has a Create-Playground button but **no
   Create-Team button**. Add a simple create-team UI inside the playground (mirror the
   create-playground UX) → `POST /api/teams` (exists) + attach to the playground (`teamIds`).
   Must be usable by a non-technical person **without** going through the coordinator.
5. **Overall:** simpler, low-computer-expertise interface + more real customizability (owner felt
   Session 38 added "some customizability but not much" inside playgrounds).
6. **Overview section nav → move into the LEFT sidebar** (owner 2026-07-07). Today the hub's section
   switcher (Dashboard | Brain | Schedule | Optimize | Websites | Tools) is a **top tab bar in the
   content area** (`app/(app)/overview/page.tsx`, hash-synced). Owner: *"the options that appear on
   the right should be on the left, similar to the chat window."* → When the Overview tab is active,
   render these sections as items in the **left sidebar** (like the Chat tab populates the sidebar),
   instead of (or in addition to) the top bar. (Interpretation of a slightly terse note — confirm the
   exact layout with the owner, but "sub-nav lives in the left sidebar like chat" is the intent.)
7. **Custom dashboards from agent-team data** (owner 2026-07-07): *"they can create their own custom
   dashboards using stuff from the agent teams."* Extend the widget registry (Session 37) beyond the
   fixed 5 Overview widgets — let users compose a dashboard from **per-team / per-agent widgets**
   (a chosen team's agents, tasks, completions, skills; agent status; etc.). The Customize flow +
   `lib/widget-registry.ts` + `User.dashboardLayout` are the base to build on. Pairs with the
   playground team drill-down (items 2–3) as the "stuff from agent teams" data source.

Backend that already exists (next session is mostly UI): `POST /api/teams`, `GET/PATCH /api/agents/[id]`,
`Agent.model` field, `components/ModelPicker.tsx`, `lib/model-catalog.ts`. This realizes PLAN §1 item 5
(team drill-down + agent editor) — the per-agent capability groundwork for permission rings (§5).

### ⏸ Still open — SHIP to friends

Prompt in `docs/SESSION-PROMPTS.md`. Sessions 35–37 are all closed; nothing install-critical open.
Ship checklist (do once the interface feedback above is worked through, or in parallel):
- **Rebuild + re-push the Docker Hub image** (`augustojmd/agentplayground:0.1.0` + `:latest`) — the
  Hub image predates Session 37 (widget registry not in it). Schema is additive; entrypoint db push
  migrates existing installs.
- Clean-machine install rehearsal following INSTALL.md literally; blockers only, zero new features.
- Final image tag + zip check + `/api/version` changelog.
- Write the friends announcement message for the owner to send.
- HANDOFF updated to the post-release phase (feedback-driven: docs/FEEDBACK.md first).
**Post-release order changed (owner 2026-07-06):** friends feedback fixes → content polish →
**Meetings + Mission Control (PLAN §1 item 7, Sessions 39–41 — live agent board + interactive
council meetings with a live room)** → agent editor → Projects (§1 items 5–6).
Widget-registry note from Session 34 (for whenever it's built): the hub Dashboard widgets are
hardcoded in `app/(app)/overview/page.tsx` (`Dashboard()` component) — that's the surface the registry
replaces. The hub's embedded windows (Brain/Schedule/Optimize/Websites/Tools) import the standalone
page components — keep that pattern.

### UI v4 spec context (owner feedback 2026-07-04)

**The four-section restoration spec is superseded. Full new spec + session breakdown: `docs/PLAN.md` §1. Read it first — don't re-derive.**

Summary (owner reviewed live UI 2026-07-04 — "did not hate it, but not what I want"):
1. Playground inner environment (`/playground/[id]`) is the right track — keep, make customizable
2. Shell → Claude Desktop pattern: sidebar tab pill **Chat | Playgrounds | Overview** (exactly three tabs), centered home greeting + coordinator input; teams live inside playgrounds (no top-level Teams); Brain access point under Chat tab → redirects to Brain window in the Overview tab
3. Playgrounds tab: coordinator quick-chat task router (team-confirmation popup + manual override) + playground list. Overview tab = system hub: customizable widget dashboard (playgrounds, teams, total tasks, plans…) + full Brain + global Schedule + Optimize + websites + other cut utilities; inside a playground, Brain (brainTags) and Schedule are scoped to that playground
3b. **Projects** (Chat tab item): isolated, disposable multi-playground workspaces — own folder + own Brain namespace + teams by reference + one-tap zero-residue teardown (anti-SensorGuard-cleanup design). Spec: docs/PLAN.md §1 item 6. Sessions 37–38.
3c. Theme: dark (charcoal/grey + blue accent, default) AND new light mode (white/grey + same blue). Logo: pixel-art playground equipment, variants pending owner pick.
3d. Session prompts ready to paste: `docs/SESSION-PROMPTS.md` (sessions 33–38)
4. Then: customizable playground dashboards/menus → per-agent editor (model, skills, Brain doc access, files) → multi-team shared-file projects
5. Still applies from old spec: purge 9 rust `#D4715A` hardcodes → `--color-brand` tokens, new ORIGINAL terminal-style logo (2–3 SVG variants for approval), centering pass, MobileNav update, docker build green

### After that (in order — see docs/PLAN.md)
1. n8n MCP tools (agents create their own workflows)
2. Self-service Telegram bots
3. Permission rings + one-tap Telegram approval + audit log
4. Agent deployment capabilities (containers, subdomains)

### Standing items (do when convenient, not blocking)
- **AR chatbot key** — VPS `ANTHROPIC_API_KEY` expired; enter a fresh key at
  `https://app.agentplayground.net/settings` → API Keys (AgentMemory-first lookup already handles it). No code change.
- **Docker Hub push + friends release** — now gated behind UI restoration (the app's face must be right first):
  ```bash
  docker build -t augustojmd/agentplayground:0.1.0 .
  docker push augustojmd/agentplayground:0.1.0
  ```

---

## Deploy Info

**Before ANY deploy:** read `docs/DEPLOY-PROTOCOL.md`.

Key rules:
- `scp` files → restart dashboard container. Never `git pull` on server.
- Slug names must match at same URL level (e.g. all `app/api/playground/teams/[id]/...` use `[id]`)
- Deleting directories requires `--no-cache` rebuild
- **Pending schema (Session 38, additive):** `User.sidebarLayout Json?` + new `RedirectLink` table.
  Entrypoint runs `prisma db push` on container start, so rebuilds self-migrate — verify on VPS.
  (`User.dashboardLayout` + `Playground.layout` were pushed in Session 37.)

```bash
# Standard deploy
scp -i ~/.ssh/id_ed25519 <file> root@95.217.163.247:/root/opt/vps/<path>
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"
```

---

## Architecture Quick Reference

| Thing | Where |
|---|---|
| VPS IP | 95.217.163.247 |
| App path on VPS | `/root/opt/vps/` |
| Chat API | `app/api/chat/route.ts` |
| Chat tools | `lib/chat-tools.ts` (30 tools) |
| Agent runner (plan tasks) | `lib/agents/runner.ts` |
| Agent runner (delegated) | `lib/agents/delegated.ts` |
| Plan dispatcher | `lib/planner/dispatch.ts` |
| Brain ingest | `lib/brain/ingest.ts` |
| SSE stream | `GET /api/notify/stream` |
| Coordinator system prompt | `app/api/chat/route.ts` → `COORDINATOR_INTRO` |
| Design tokens | `app/globals.css` |
| Wallet addresses | `app/(app)/billing/page.tsx` → `WALLETS` |
| MCP endpoint | `app/api/mcp/route.ts` |

### Coordinator Flow
```
User → Coordinator (25 tool iterations)
  → delegate_to_team(teamId, title, desc)   ← single task, immediate
  → create_plan(goal) → run_plan(planId)    ← multi-team, parallel
  → get_task_result(taskId) × N → synthesize
```

### Not Built Yet
- Telegram env vars on VPS (`TELEGRAM_GROUP_CHAT_ID`, `TELEGRAM_OWNER_CHAT_ID`) — add to `.env.local` + restart
- LLM Provider Settings UI
- Admin Monitoring Panel
- Stripe payment automation
- Empty states (Plans, Teams, Brain, Schedule)
- Live blockchain integration (Crypto Wallet scaffold only)

---

## Session History (condensed)

| Sessions | What |
|---|---|
| 1–4 | Core platform: teams, agents, skills, chat, files, schedule, billing schema |
| 5–6 | 2nd Brain (vault + pgvector), MCP endpoint, Brain page, Telegram pipeline |
| 7–8 | Plans system, council, planner, dispatcher, provider adapter, SSE, /plans UI |
| 9–10 | PWA, agent editor, design systems v1–v3, Ollama tool loop, council/vps tools |
| 11–12 | Phase A (Playground Hub), Phase B (Admin Panel), Phase C1–C2 (delegation, business skills) |
| 13 | Playground redesign (groups, tabs, widgets), Crypto Wallet scaffold, Phase C4 (MCP expansion) |
| 14 | Live activity strip (SSE), request_human_input + checkpoint, playground → Agent Teams |
| 15 | Project status dashboard, Telegram bidirectional + group notifications, live widget data |
| 16 | Hotfix: slug conflict `[teamId]`→`[id]`; deploy protocol doc |
| 17 | Documentation restructure, session reports system, generate_session_report tool |
| 18–20 | Personal OS pages (CV/learn/notes), Local LLM flywheel, SensorGuard demo, GuardTech site |
| 21 | SensorGuard cleanup: deleted demo code, VPS cleanup, merged to master, desktop pivot begins |
| 22–27 | Desktop app Phase 1: nav gating, API keys settings, licenses, wizard, docker packaging, marketing site |
| 28–31 | Phase 2 (the disliked redesign): flat nav + rust asterisk logo, playground environment, creation assistant, overview dashboard, AR lead-gen rebuild |
| 32 | New vision adopted (docs/VISION.md), build fix (slug conflicts), repo cleanup, plan + business docs realigned |

Full history → `docs/SESSION-HISTORY.md`
