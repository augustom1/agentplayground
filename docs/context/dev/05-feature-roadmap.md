# Feature Roadmap — Next 6 Months

> Priority order. Dev agents should pick tasks from this list when asked to work.
> Check `docs/context/dev/03-build-state.md` first — don't rebuild what exists.

---

## Priority 1 — Blog Auto-Generation

**Status:** Not started  
**Why:** Builds SEO presence + demonstrates platform capability (meta: the platform writes its own marketing)  
**Page:** `/blog/generate`

### What to Build
1. Page UI: topic input, optional outline, "Generate Draft" button
2. On submit: `delegate_to_team("Business & Growth", "Write blog post: [topic]")`
3. Business team agent drafts post → saves to Brain (`source: content:draft:[slug]`)
4. Draft surfaces as PendingAction: "Blog draft ready for review: [title]"
5. Augusto reviews in chat → approves → coordinator `write_file` to `data/blog/<slug>.md`
6. Blog post renders at `/blog/[slug]`

### Acceptance Criteria
- [ ] `/blog/generate` page exists with topic + outline inputs
- [ ] Submit triggers delegation, shows loading state
- [ ] Draft saved to Brain and PendingAction created
- [ ] `/blog/[slug]` renders markdown content correctly
- [ ] `/blog` index lists all posts with dates

---

## Priority 2 — CV Subdomain

**Status:** `/cv` page built locally (personal-profile.md has context)  
**Why:** Public professional presence + demo of Brain-powered public pages  
**URL:** `cv.agentplayground.net` or `/public/cv/[username]`

### What to Build
1. Public route `/public/cv/[username]` — no auth required
2. Reads CV data from Brain (`recall_memories` key `cv_content` or Brain query)
3. Renders as clean HTML page (not the app shell)
4. Traefik or Next.js middleware routes `cv.agentplayground.net` → `/public/cv/augusto`
5. CV Advisory team: `update_cv` skill that writes to Brain memory key `cv_content`

### Acceptance Criteria
- [ ] `/public/cv/augusto` renders without auth
- [ ] CV content pulled from Brain / AgentMemory
- [ ] Clean print-friendly layout (no sidebar, no nav)
- [ ] Mobile responsive
- [ ] `cv.agentplayground.net` routes correctly (Traefik label or Next.js redirect)

---

## Priority 3 — Job Application Agents

**Status:** Job Search team seeded, UI missing  
**Why:** Automates the most time-consuming part of job hunting  
**Page:** `/jobs`

### What to Build
1. `/jobs` page: paste job description, click "Analyze"
2. Job Scout agent analyzes: fit score, required skills vs. CV gaps, red flags
3. Application Writer agent: drafts cover letter (tailored, using CV from Brain)
4. Outreach Drafter agent: LinkedIn connection message
5. All outputs saved to Brain + Project

### Acceptance Criteria
- [ ] `/jobs` page with text area for job description + "Analyze" button
- [ ] Job analysis card shows: fit %, matched skills, gaps, recommendation
- [ ] Cover letter draft displayed inline
- [ ] "Save to Brain" button stores application for later reference
- [ ] History: list of analyzed jobs with status (applied / pending / rejected)

---

## Priority 4 — LLM Provider Settings UI

**Status:** Backend fully done (`lib/providers/`), API routes exist  
**Why:** Users need to configure their own API keys and set defaults per team  
**Page:** `/settings/providers`

### What to Build
1. List all providers: Anthropic, OpenAI, Ollama
2. Per provider: API key input (masked), test connection button, status badge
3. Per team: dropdown to set default provider
4. Ollama: show available models (from `GET http://ollama:11434/api/tags`)
5. Save to DB: `LLMProviderConfig` model (check if exists, add if not)

### Acceptance Criteria
- [ ] `/settings/providers` lists Anthropic, OpenAI, Ollama
- [ ] API key fields save correctly and show masked values
- [ ] "Test" button verifies connection and shows latency
- [ ] Ollama model list pulls live from Ollama API
- [ ] Default provider saved per team

---

## Priority 5 — Admin Monitoring Panel

**Status:** Partially built (Index Docs + Overnight done)  
**Why:** Need visibility into platform health before scaling  
**Page:** `/admin/monitoring` or expand `/admin/system`

### What to Build
1. DB size: `SELECT pg_size_pretty(pg_database_size(...))` — show in MB/GB
2. BrainDocument count + BrainChunk count
3. Active SSE connections (Redis pub/sub subscriber count)
4. Ollama status: ping `http://ollama:11434/api/health`, show loaded models
5. ApiUsage chart: tokens by model per day (last 30 days, Chart.js or Recharts)
6. Task volume: tasks created/completed/failed per day
7. PendingAction count (unresolved)

### Acceptance Criteria
- [ ] Dashboard shows all metrics above
- [ ] Charts use real ApiUsage data
- [ ] Auto-refreshes every 60 seconds
- [ ] Ollama section shows model list + memory usage if available
- [ ] Error state if VPS unreachable (don't crash the whole page)

---

## Priority 6 — Empty States

**Status:** Not started — blank divs when no data  
**Why:** Critical for onboarding new users; blank screens kill trust  
**Pages:** `/plans`, `/agent-lab`, `/brain`, `/schedule`

### What to Build
Per page — an empty state component with:
- Lucide icon (large, muted)
- Headline: what this page does
- One-sentence description
- CTA button that launches the right action

| Page | Icon | CTA |
|---|---|---|
| `/plans` | `GitBranch` | "Create your first plan" → opens create plan dialog |
| `/agent-lab` | `Bot` | "Create your first team" → opens create team dialog |
| `/brain` | `Brain` | "Index your docs" → calls `/api/admin/index-docs` |
| `/schedule` | `Calendar` | "Schedule an event" → opens calendar dialog |

### Acceptance Criteria
- [ ] Each page shows empty state when data array is empty
- [ ] Empty state renders correctly on mobile
- [ ] CTA buttons work (trigger the right action, don't navigate away unnecessarily)

---

## Backlog (Lower Priority)

| Item | Notes |
|---|---|
| Token usage dashboard | `/settings/usage` — ApiUsage chart per model |
| Background task log | `/tasks` — all tasks searchable |
| Weekly optimization scan | Wire `lib/optimizer/scanner.ts` to cron |
| Webapp hosting by agents | `HostedApp` model + nginx config gen |
| Agent evolution/versioning | `version` + `changelog` on Agent model |
| Telegram env vars | Add to `.env.local` on VPS and restart |
| Live blockchain integration | Awaits crypto wallet details from user |
