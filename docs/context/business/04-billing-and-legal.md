# Billing, Finance & Legal Structure

> Used by Billing Monitor agent, Financial Planner team, and coordinator when handling money, invoicing, or legal questions.

---

## Legal Entities

### Monotributo (Active)
- Argentine simplified tax regime for freelancers
- Activity registered: technology consulting + software services
- Bills in: USD (international clients) + ARS (Argentine clients)
- Monthly obligations: pay monthly Monotributo fee, track income, stay within category limits
- Invoicing: must issue formal `factura` for every transaction
- Agent task: track monthly income, alert when approaching category limit

### Wyoming LLC (Not Yet Opened)
- Purpose: accept international SaaS subscription payments
- Open when: first recurring SaaS customer signs up
- Structure: single-member LLC → no state income tax → periodic transfer to Argentine account
- Filing: US federal return required annually (Form 5472 + Form 1120 if applicable)
- Coordinator should flag when it's time to open this (first SaaS customer milestone)

---

## Crypto Billing Flow

This is how client payments will flow once the Billing Monitor agents are built:

```
Client pays
    ↓
USDT/USDC wallet (Polygon / TRC20 / BSC — chain TBD)
    ↓
Billing Monitor Agent detects payment
    ↓
Invoice Matcher Agent: find matching open invoice → mark paid
    ↓
Transfer Agent: move to ARQ account (Argentine registered crypto account)
    ↓
Compliance Logger: record transaction for tax purposes
    ↓
Notify Augusto via Telegram
```

### What's Missing (Needs User Input)
- [ ] Primary USDT wallet address (which chain: TRC20, Polygon, or BSC?)
- [ ] ARQ account details (COINFLEX or other provider?)
- [ ] Minimum payment threshold before auto-transfer
- [ ] Auto-transfer vs. manual approval per transfer?

Until these are provided, keep crypto billing on manual/informal basis.

---

## Current Wallet Addresses

Stored in `app/(app)/billing/page.tsx` → `WALLETS` constant. Agents should not hardcode wallet addresses — always reference the WALLETS constant or ask coordinator.

---

## Invoice Workflow

For Monotributo:
1. Client confirms service → coordinator creates invoice record
2. Augusto issues formal factura via AFIP portal (must be done manually — no API)
3. Record invoice details in Brain: amount, client, date, status
4. Mark paid when payment confirmed

For future Wyoming LLC:
1. Stripe subscription → automatic invoice generation
2. Or crypto payment → Billing Monitor agent

---

## Financial Tracking

The Financial Planner team handles:
- Monthly income tracking (total invoiced vs. received)
- Expense tracking (VPS cost, API costs, tools)
- Monotributo category monitoring (income limits)
- Crypto portfolio tracking (if wallet data provided)
- Monthly P&L summary → saved to Brain

Target KPIs to track monthly:
- Gross revenue (USD)
- Net revenue after costs
- API spend (Claude + OpenAI)
- VPS cost (Hetzner)
- Revenue per active client

---

## Pricing in Different Currencies

- USD pricing: primary for international clients
- ARS pricing: local Argentine clients — adjust quarterly for inflation
- Crypto: USDT/USDC at face value (1:1 with USD)
- Never quote ARS amounts in advance — set ARS price at time of invoicing based on current rate

---

## Tax Obligations (Summary — Not Tax Advice)

| Obligation | Frequency | Handler |
|---|---|---|
| Monotributo payment | Monthly | Augusto manually |
| Income declaration | Annual | Augusto with accountant |
| Wyoming LLC filing | Annual (when opened) | US accountant |
| Crypto transaction log | Always | Compliance Logger agent |

Coordinator should NOT give tax advice. If a client or user asks a tax question, flag it: "You should confirm this with your accountant — I can draft the question for them."
