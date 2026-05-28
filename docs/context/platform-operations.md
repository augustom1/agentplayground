# Platform Operations Context — AgentPlayground

> Used by Dev team, coordinator, and monitoring agents.
> Agents should keep this updated as the platform evolves.

---

## VPS Infrastructure
- Provider: Hetzner
- IP: 95.217.163.247
- OS: Ubuntu (Docker host)
- Path: /root/opt/vps/
- RAM: 16GB (constraint — affects which Ollama models can run)
- Ollama models available: qwen2.5:3b, qwen2.5:7b, nomic-embed-text

## Containers (Docker Compose)
| Container | Role |
|---|---|
| dashboard | Next.js app (port 3000 internal) |
| postgres | PostgreSQL 16 + pgvector |
| redis | Session cache + SSE queue |
| ollama | Local LLM server |
| traefik | Reverse proxy + TLS |

## Deploy Protocol
- NEVER git pull on VPS — always scp files
- After deleting directories: rebuild with --no-cache
- Schema changes: docker compose exec dashboard npx prisma db push
- Slug rule: same param name at same URL depth

---

## Token Consumption (Agents Should Track)
- Coordinator: claude-sonnet-4-6 @ ~$0.003/1K tokens (input) + $0.015/1K (output)
- Worker agents: claude-haiku-4-5 @ ~$0.00025/1K input + $0.00125/1K output
- Local tasks: qwen2.5:7b via Ollama = $0 (local)
- ApiUsage table tracks all calls — check weekly via Admin panel
- Goal: shift routine tasks to local LLM as Brain context grows

## Monitoring Checklist (Weekly)
- [ ] Check ApiUsage table — any unusual spikes?
- [ ] Check activityLogs — failed tasks or errors?
- [ ] Check BrainDocument count — growing as expected?
- [ ] Check disk usage on VPS (docker system df)
- [ ] Review PendingAction items — any unresolved?

---

## Documentation Maintenance
Agents should keep these files current:
- `HANDOFF.md` — updated end of every session
- `docs/PLAN.md` — updated when priorities change
- `docs/architecture.md` — updated when new routes/models added
- `docs/code/` — overnight agents write module docs here
- `docs/business/` — business agents write strategy docs here
- `docs/reports/` — coordinator writes session reports here
- `docs/context/` — this folder — coordinator updates as user provides info

---

## Upcoming Infrastructure Work
- [ ] Telegram env vars: TELEGRAM_GROUP_CHAT_ID + TELEGRAM_OWNER_CHAT_ID
- [ ] Stripe webhook + payment automation
- [ ] Monthly credit reset cron
- [ ] Live blockchain integration (Crypto Wallet agents — needs API keys)
- [ ] Admin monitoring panel (DB size, SSE connections, error logs live view)

---

## Agent Evolution Targets
As token data accumulates in ApiUsage:
1. Identify tasks currently using Claude that could run on qwen2.5:7b
2. Migrate low-complexity tasks (summarization, classification, template fill) to local
3. Reserve Claude for: coordinator reasoning, complex writing, tool use
4. Track savings in OptimizationScan table
