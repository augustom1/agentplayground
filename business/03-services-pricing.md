# Services & Pricing — Agent Playground
> Updated: 2026-07-06 — private-server-first model (owner decision). Supersedes the 2026-07-02
> catalog (custom playground / full install / managed hosting tiers). Aligned with `docs/VISION.md` §1.
> These are the current prices. Older price tables in this folder are historical.

## The model in one line

**Push hard for Private Server Deployments** (one-time fee + recurring composed fee).
Installations alone are a side business. **No shared/multi-tenant hosting yet.**

---

## SERVICE 1 — Private Server Deployment (FLAGSHIP — push this)

The client gets their own private VPS running the full Agent Playground stack with playground(s)
built for their business. We broker and manage the infrastructure; they own everything.

**What the client gets:**
- Their own VPS — either they rent it directly, or we rent it for them (brokered, see recurring)
- Full stack deployed: dashboard, PostgreSQL + pgvector, Redis, Ollama, n8n, Traefik + SSL
- Custom domain, admin account, seeded teams
- Custom playground(s) built to their spec (discovery call → configured teams, skills, scoped
  Brain tags, starter docs, needed n8n workflows)
- Client's own LLM API keys configured (they own their token spend — always)
- Onboarding + walkthrough

**One-time fee: $1,000–2,000**, scoped by:
- how many **apps/integrations** their agent teams need (external APIs, data sources, workflows)
- how many **users** will use the system
- number of playgrounds/teams; data or workflow migration if any

| Scope | Guide price |
|---|---|
| Base: stack + 1 custom playground, small team of users, standard apps | $1,000 |
| + extra playground(s), extra app integrations, more users | $1,200–1,700 |
| Complex: migrations, many integrations, custom development | $2,000 |

**Recurring monthly fee** (one invoice, composed of):

| Component | Amount |
|---|---|
| Server cost passthrough | whatever the VPS costs (e.g. Hetzner ~€9–19/mo) |
| Brokerage fee | **+~30%** on the server cost (industry-standard markup) — only when we rent it for them |
| Maintenance | fixed monthly fee — updates, monitoring, backups, support (guide: $75–100/mo; owner sets per client) |
| Per-app fees (FUTURE) | recurring charge per API app included in their agent teams, once the app catalog exists |

Worked example: €15/mo box → ~$16 passthrough + ~$5 brokerage + $75 maintenance ≈ **~$96/mo**.
If the client rents their own VPS, they pay the provider directly and the brokerage line drops out.

**Delivery:** 1–2 weeks.

**Always:** after delivery, produce an anonymized generic template for the Playground Library
(unless the client's use case is truly unique or confidential).

---

## SERVICE 2 — Custom Playground ($350–500)

A playground built to the client's spec, deployed into their **existing** Agent Playground
installation. Same content as the flagship's playground component, sold standalone.

- $350 — single team, standard tools, no custom integrations
- $500 — multiple teams and/or a custom integration (external API, custom data source)

**Delivery:** 3–7 business days. Library template rule applies.

---

## SERVICE 3 — Assisted VPS Install ($50, side business)

We run the install on the client's own VPS: app + database + Redis + proxy pulled and running.
**Nothing else is configured** — the client opens the app and connects their domain, SSL, and API
keys themselves (the app walks them through it).

**Hard boundary (this is what makes $50 viable):** $50 buys a running app, not consulting.
Domain/DNS/key questions beyond the app's built-in guidance → quote Service 1 or 2, or the
maintenance fee. State this in writing at sale time.

---

## Shared / multi-tenant hosting — NOT OFFERED YET

Owner decision 2026-07-06: no rented shared boxes until demand justifies the operational load.
The platform stays multi-tenant-aware (per-client compose stacks, separate networks, Traefik per
domain) so this can open later without retrofitting. When it opens, it becomes the budget tier
below Private Server Deployment.

---

## Add-ons (any tier)

| Add-on | Price |
|---|---|
| Additional custom playground | $350–500 (Service 2) |
| Custom n8n workflow (standalone) | $150–400 depending on complexity |
| Additional website hosted on their stack | $200 setup |
| Extra onboarding/training session | $75/hour |

---

## What We Do NOT Sell

- Per-seat SaaS licenses (the core is open source)
- Raw development hours without a defined deliverable
- Anything requiring us to hold client private keys or payment credentials
  (RED-ring actions always remain with the client)
- Shared hosting (for now — see above)

## Quoting Rules

1. Anchor on outcomes ("your agents will do X") not components.
2. Scope the one-time fee on apps + users — ask both questions in every discovery call.
3. Custom quote only when the request doesn't fit the catalog — and if it happens twice,
   it becomes a catalog item.
4. Every proposal states: client owns infrastructure, client owns keys, client can leave
   anytime (open source) — this is the trust pitch that closes deals.
5. LLM usage always runs on the client's own API keys, or metered with an explicit, stated
   markup. Never absorbed silently. (Future per-app fees cover integration maintenance,
   not tokens.)
