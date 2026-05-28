# Business Setup Context — AgentPlayground / Augusto Meyer

> This document is a coordinator briefing. Read it before any business-related conversation.
> Keep it updated as the user provides more information.

---

## Business Structure

### Current: Monotributo (Argentina)
- Legal vehicle: Monotributo — Argentine simplified tax regime for freelancers
- Activity: Technology consulting + software services
- Billing clients in: USD (international) + ARS (local)
- ARQ Account: Argentine registered crypto account (COINFLEX or similar) — final destination for filtered crypto payments

### Future: Wyoming LLC (USA)
- Purpose: Sell software subscriptions internationally (AgentPlayground SaaS)
- Timeline: To be opened once platform has paying customers
- Structure: Wyoming LLC → accepts USD/crypto payments → periodic transfer to Argentine account
- Tax strategy: Wyoming LLC has no state income tax; federal filing as single-member LLC

### Entity Separation
- Monotributo = service work (consulting, dev work, freelance clients)
- Wyoming LLC = product sales (SaaS subscriptions, white-label)
- Keep separate invoicing and accounts for each entity

---

## Crypto Billing System

### Flow
1. Client pays → crypto wallet (USDT/USDC on efficient chain: Polygon, BSC, or Tron)
2. Agent monitors wallet → detects incoming payment
3. Agent logs transaction → matches to invoice
4. Agent initiates transfer to ARQ account (Argentine registered crypto account)
5. ARQ account = compliant bridge to Argentine banking system

### Agent Responsibilities
- `Billing Monitor Agent`: watches crypto wallets for incoming payments
- `Invoice Matcher Agent`: matches payment amounts to open invoices
- `Transfer Agent`: initiates transfer to ARQ when payment confirmed
- `Compliance Logger Agent`: logs all transactions for tax purposes

### Wallets (NEEDS USER INPUT)
- [ ] Primary USDT wallet address (TRC20/Polygon)
- [ ] ARQ account details
- [ ] Preferred chain (TRC20 / Polygon / BSC)

### Data Needed from User (Coordinator should ask):
1. What is your ARQ account address or exchange account?
2. What chain do you prefer for receiving payments?
3. What is the minimum payment threshold before auto-transfer?
4. Do you want auto-transfer or manual approval per transfer?

---

## Service Offering

### What We Sell
1. **AI Coordinator Access** — chat with coordinator + delegate to agent teams
2. **Personal OS** — CV, education, finance, fitness agent teams
3. **Business Platform** — business team + brain auto-population + weekly reports
4. **Client Hosting** — deploy the platform for client businesses (white-label)
5. **Custom Agent Development** — build bespoke agent teams for enterprise clients

### Pricing (Draft — Agent should refine)
| Tier | Price | Includes |
|---|---|---|
| Personal | $19/mo | Coordinator + 3 personal teams + Brain |
| Business | $49/mo | Personal + business teams + reports + Telegram |
| Agency | $149/mo | Everything + client hosting + white-label |

---

## Blog Content Strategy

### Target Posts
1. "How I built an AI coordinator that manages my entire life" — personal story
2. "Setting up a Monotributo as a dev freelancer in Argentina" — practical guide
3. "Why I chose Ollama for overnight AI tasks (and saved $X/month)" — technical
4. "The Personal OS Stack: coordinators, agent teams, and local LLMs" — flagship post
5. "AI agents for billing and crypto — how to build a compliant payment flow" — business

### Blog Automation
- Coordinator writes draft → saves to Brain → staged for human review → published
- Each post should include: intro, technical walkthrough, screenshots/code, conclusion
- SEO: target keywords per post defined before writing

---

## Pending Setup Tasks (Coordinator Action Items)
These will be created as pending actions when context is seeded:

1. Collect ARQ account + preferred crypto chain
2. Define exact service tiers (pricing, feature list per tier)
3. Draft Monotributo billing template (invoice template in pesos + USD)
4. Wyoming LLC — research costs, registered agent options
5. Write first blog post draft (flagship: "How I built an AI coordinator")
