# Business Roadmap — Agent Playground
> Updated: 2026-07-02 — aligned with `docs/VISION.md` and `docs/PLAN.md`.
> Technical build order lives in `docs/PLAN.md`; this file is the business view of the same timeline.

---

## Now (July 2026) — Fix the product face, then release

The product must look and feel right before anyone new sees it.

### 1. UI restoration (blocks everything)
- Four-section layout (Chats / Playgrounds / Teams / Brain), Claude-Desktop-adjacent feel,
  original terminal-style logo. See `docs/PLAN.md` §1.
- **Business reason:** this is the product demo. The current UI actively hurts the pitch.

### 2. Open source release
- Docker Hub push + GitHub release + `agentplayground.net/download`.
- Send to friends first (soft test), then public.
- **Business reason:** the open core is the top of the funnel — nothing else in the model
  starts working until it ships.

### 3. First AR leads
- `ar.agentplayground.net` is live as a lead-gen page (chatbot + contact, no listed prices).
- Follow up every lead by hand; goal is 2–3 discovery calls to validate the Service 1/2 pitch.

---

## Next (Aug–Sep 2026) — Agents that operate infrastructure

The platform's differentiator: agents that DO things, not chatbots. Built in this order
(technical detail in `docs/PLAN.md` §3–6):

1. **n8n MCP tools** — agents create their own automation workflows
2. **Self-service Telegram bots** — agents register and run their own bots
3. **Permission rings + one-tap Telegram approval + audit log** — safe autonomy, sellable trust story
4. **Deployment capabilities** — agents deploy containers and subdomains within the rings

**Business framing:** each stage is independently demonstrable → each stage is a miniseries
episode → each episode is marketing. Build → demo → publish, every stage.

### Budget dashboard (cross-cutting)
- Per-agent/per-team budgets, burn-rate reports, kill-switches.
- **Business reason:** becomes a client-facing feature — "you always know what your agents cost."

---

## Later (Q4 2026) — The library and managed tiers at scale

### Playground Library
- Catalog of ready-made playgrounds clients browse, try, deploy.
- Fed by anonymized templates from every custom project (rule in `00-overview.md`).
- Unlocks the $180–200/mo tier — recurring revenue on assets already paid for by custom work.

### Multi-tenant hosting at scale
- One powerful server, several client stacks: per-client compose, networks, caps, Traefik.
- Target: first 5 managed clients on shared infra, first dedicated-tier client by year end.

### Content flywheel
- Video miniseries: agents building real infrastructure (each roadmap stage = episodes).
- Every client delivery that becomes a template also becomes a case-study post.

---

## Revenue targets (sanity check, not promises)

| Horizon | Target |
|---|---|
| Sep 2026 | 3–5 one-off projects delivered ($1,500–4,000 cumulative) |
| Dec 2026 | 5 managed clients (~$600–900 MRR) + library tier live |
| Mid 2027 | 10–15 managed clients ($1,500–3,000 MRR), library as main upsell |

---

## Standing rules

- Nothing client-facing ships without the ring/permission story working (trust is the pitch).
- Every custom build ends with the template question.
- Internal company operations run on the platform itself — if it's not good enough for us,
  it's not good enough to sell.
