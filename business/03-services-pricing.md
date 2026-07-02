# Services & Pricing — Agent Playground
> Updated: 2026-07-02 — aligned with `docs/VISION.md` §1 and `00-overview.md`.
> These are the current prices. Older price tables in this folder are historical.

## Service Catalog

---

### SERVICE 1 — Custom Playground ($350–500)

A playground built to the client's spec, deployed into their existing Agent Playground installation
(self-hosted or on one of our managed tiers).

**What the client gets:**
- Discovery call: what should the agents actually do
- A configured playground: agent team(s), skills, scoped Brain tags, starter documents
- Any n8n workflows the playground needs
- Walkthrough call + short usage guide

**Pricing guidance:**
- $350 — single team, standard tools, no custom integrations
- $500 — multiple teams and/or a custom integration (external API, custom data source)

**Delivery:** 3–7 business days.

**Always:** after delivery, produce an anonymized generic template for the Playground Library
(unless the client's use case is truly unique or confidential).

---

### SERVICE 2 — Full Framework Installation + Custom Playground ($1,000–1,500 one-off)

For clients starting from zero: their own complete Agent Playground stack plus a custom playground.

**What the client gets:**
- VPS provisioned (client pays the provider directly, e.g. Hetzner ~€9–19/mo)
- Full stack deployed: dashboard, PostgreSQL + pgvector, Redis, Ollama, n8n, Traefik + SSL
- Custom domain, admin account, seeded teams
- One custom playground (Service 1 included in the price)
- Client's own LLM API keys configured (they own their token spend)
- 1-hour onboarding + 30 days of installation support

**Pricing guidance:**
- $1,000 — standard install + one straightforward playground
- $1,500 — complex playground, extra integrations, or migration of existing data/workflows

**Delivery:** 1–2 weeks.

---

### SERVICE 3 — Managed Hosting (recurring)

| Tier | Price | What they get |
|---|---|---|
| **Basic** | ~$100/mo | Stack hosted on shared multi-tenant server (isolated per-client Docker stack, own domain, resource caps), updates, monitoring, backups, email support |
| **Library** | ~$180–200/mo | Basic + full Playground Library access: browse, try, and deploy ready-made playgrounds |
| **Dedicated** | ~$250–300/mo | Own server (no sharing), priority support, custom resource sizing |

**Rules:**
- LLM usage always runs on the client's own API keys, or metered with an explicit,
  stated markup. Never absorbed silently.
- Multi-tenant isolation: per-client compose stack, separate Docker network, Traefik per domain.
- Local Ollama models included on all tiers where server resources allow — routine tasks at zero token cost.

---

### Add-ons (any tier)

| Add-on | Price |
|---|---|
| Additional custom playground | $350–500 (Service 1) |
| Custom n8n workflow (standalone) | $150–400 depending on complexity |
| Additional website hosted on their stack | $200 setup |
| Extra onboarding/training session | $75/hour |

---

## What We Do NOT Sell

- Per-seat SaaS licenses (the core is open source)
- Raw development hours without a defined deliverable
- Anything requiring us to hold client private keys or payment credentials
  (RED-ring actions always remain with the client)

## Quoting Rules

1. Anchor on outcomes ("your agents will do X") not components.
2. Custom quote only when the request doesn't fit the catalog — and if it happens twice,
   it becomes a catalog item.
3. Every proposal states: client owns infrastructure, client owns keys, client can leave
   anytime (open source) — this is the trust pitch that closes deals.
