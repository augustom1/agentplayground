# Build State — What's Done, What's Not

> Honest inventory of every feature and its current status. Updated as of 2026-06-13.
> Dev agents should check this before scoping any task to avoid rebuilding what exists.

---

## Core Platform (All Working in Production)

| Feature | Status | Notes |
|---|---|---|
| Teams, Agents, Skills CRUD | ✅ Live | `/agent-lab` |
| Chat with streaming | ✅ Live | `/chat`, SSE streaming |
| 30+ coordinator tools | ✅ Live | `lib/chat-tools.ts` |
| 25-iteration tool loop | ✅ Live | `app/api/chat/route.ts` |
| NextAuth v5 auth | ✅ Live | JWT, role-based |
| Onboarding wizard | ✅ Live | `/setup` (4 steps) |
| Dashboard (widgets) | ✅ Live | `/dashboard` drag-drop |
| Playground Teams | ✅ Live | `/playground` multi-agent chat |
| Plans system | ✅ Live | create → council → approve → dispatch → parallel exec |
| LLM Provider adapter | ✅ Live | `lib/providers/` (Claude, Ollama, OpenAI) |
| Admin panel | ✅ Live | `/admin` (analytics, API monitor, credits, system) |
| Brain (pgvector) | ✅ Live | vault notes + BrainDocuments + HNSW index |
| Semantic search | ✅ Live | `lib/brain/query.ts` |
| MCP endpoint | ✅ Live | `/api/mcp` (JSON-RPC) |
| SSE live activity strip | ✅ Live | `/api/notify/stream` + chat UI |
| `request_human_input` | ✅ Live | Pauses agent, SSE event + Telegram |
| Project status dashboard | ✅ Live | `/projects` |
| Telegram DMs | ✅ Live | Bidirectional → coordinator |
| Telegram group notifications | ✅ Live | |
| Telegram settings UI | ✅ Live | `/settings` |
| PWA (installable) | ✅ Live | manifest + icons |
| Design System v3 | ✅ Live | charcoal `#1a1a1a`, rust `#D4715A` |
| Actions system | ✅ Live | `PendingAction` model, `/actions`, create/dismiss/list |
| Personal OS pages | ✅ Live | `/cv`, `/learn`, `/notes` |
| Admin system tools | ✅ Live | Seed Context, Index Docs, Overnight Knowledge Build |
| Local LLM flywheel | ✅ Live | runner.ts classifier → Ollama routing |
| Extended thinking | ✅ Live | `lib/providers/anthropic.ts` |
| Sessions report tool | ✅ Live | `generate_session_report` (tool #30) |
| `vps_exec` tool | ✅ Live | Exec commands on VPS via SSH |
| System flow overview | ✅ Live | `/overview` |

---

## Partially Built

| Feature | Status | What's Missing |
|---|---|---|
| LLM Provider Settings UI | 🔶 Backend done | Frontend `/settings/providers` page not built |
| Admin Monitoring Panel | 🔶 Partial | DB size, SSE connections, Ollama status, live error view |
| Empty states | 🔶 Not started | `/plans`, `/agent-lab`, `/brain`, `/schedule` show blank divs |
| Crypto Wallet scaffold | 🔶 Scaffold only | 3 agents + 3 skills defined but no live blockchain connection |
| Stripe billing | 🔶 Schema done | Needs Stripe keys + webhook wiring |
| Monthly credit reset cron | 🔶 Schema done | No reset logic implemented |

---

## Not Built Yet

| Feature | Priority | Notes |
|---|---|---|
| Blog auto-generation | High | `/blog/generate` page — agent drafts posts → Brain → publish |
| CV subdomain | High | `cv.agentplayground.net` or `/public/cv/[username]` |
| Job application agents | High | `/jobs` page — paste job desc → cover letter + outreach |
| Telegram env vars on VPS | Medium | `TELEGRAM_GROUP_CHAT_ID` + `TELEGRAM_OWNER_CHAT_ID` in .env.local |
| Agent evolution/versioning | Medium | `tools`, `version`, `changelog` fields on Agent model |
| Token usage dashboard | Medium | ApiUsage data exists, need chart at `/settings/usage` |
| Background task log | Medium | `/tasks` page — all tasks searchable with results |
| Weekly optimization scan | Medium | `lib/optimizer/scanner.ts` exists, not wired to cron |
| Webapp hosting by agents | Low | `HostedApp` DB record + agent-generated nginx config |
| Multi-tenant isolation | Low | `tenantId` on models but no routing logic |
| Google/Microsoft OAuth | Low | Phase C3 |
| Landing page Brain section | Low | Block G — not started |

---

## Demo / Temp (Remove After 2026-06-19)

| Item | Location | Action |
|---|---|---|
| SensorGuard API routes | `app/api/sensorguard/` | Delete after semester |
| GuardTech site | `webroot/guardtech/` | Delete after semester |
| GuardTech vhost | `sites/guardtech.conf` | Delete after semester |
| Compose labels | `docker-compose.prod.yml` | Remove guardtech block |
| Branch | `feature/sensorguard-demo` | Delete after semester |

---

## Database Models (All Deployed)

Core: `User`, `Team`, `Agent`, `Skill`, `Task`, `TaskResult`, `AgentMemory`
Brain: `VaultNote`, `BrainDocument`, `BrainChunk`
Plans: `Plan`, `PlanTask`
Projects: `Project`, `ProjectOutput`
Schedule: `ScheduledEvent`, `Meeting`
Admin: `ApiUsage`, `ActivityLog`, `OptimizationScan`
Actions: `PendingAction`
Personal: `UserNote`
Billing: `UserCredit`, `CreditTransaction`
