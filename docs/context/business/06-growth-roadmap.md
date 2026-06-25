# Growth Roadmap — AgentPlayground

> The four phases from personal tool to scalable SaaS. Used by Business & Growth team when making strategic recommendations.

---

## Phase 1 — Personal OS (DONE)
**Goal:** Use the platform yourself. Prove it works.

What was built:
- Coordinator with 30 tools
- 8+ agent teams (Dev, DevOps, Business, Personal OS teams)
- Brain (pgvector knowledge base)
- Plans system (multi-team parallel execution)
- Local LLM flywheel (Ollama routing)
- Telegram bidirectional
- Admin panel + monitoring

**Exit condition:** ✅ Platform is live, Augusto uses it daily, all core features work.

---

## Phase 2 — First Client (NEXT)
**Goal:** Sign one paying client. Validate that you can deliver value and get paid.

What needs to happen:
1. Pick target client profile (small Argentine business, ≤10 employees, needs website + content)
2. Offer first client: full bundle at 50% off for 3 months in exchange for testimonial
3. Deploy their chatbot + content pipeline using existing agent teams
4. Deliver: 12 social posts + 1 monthly report + chatbot responses in month 1
5. Collect payment (crypto or bank transfer) + issue Monotributo factura
6. Document the delivery process → write case study for blog

**When this is done:** Open Wyoming LLC, set Stripe/crypto billing to list prices.

**Key question to answer:** What does it actually take to serve a client on this platform? What breaks?

---

## Phase 3 — SaaS (≥3 months out)
**Goal:** Other people can sign up, pay, and run their own instance.

What needs to be built:
- Self-serve onboarding wizard (already started at `/setup`)
- Multi-tenant database isolation (tenantId on all models — schema ready)
- Stripe subscription billing (schema done, needs Stripe keys + webhook)
- Operator dashboard (already exists — needs per-tenant scoping)
- Wyoming LLC opened + Stripe connected
- Landing page with pricing + sign-up flow
- SLA and support process defined

**Target customer:** Argentine or LatAm agency/freelancer who can't afford a dev team.

---

## Phase 4 — Agency / White-Label (12+ months out)
**Goal:** Agencies resell AgentPlayground under their own brand to their clients.

What needs to be built:
- White-label branding (custom logo, colors, domain per operator)
- Client management panel inside operator workspace
- Revenue share or flat white-label fee model
- Operator onboarding + training materials
- Support escalation path (operator → Augusto)

---

## Milestones & Triggers

| Milestone | Triggers |
|---|---|
| Phase 1 complete | ✅ Done |
| First client signed | Open Wyoming LLC, enable Stripe billing |
| 5 paying clients | Hire first part-time human support assistant |
| $1k MRR | Invest in dedicated server (upgrade VPS or add node) |
| 10 operators on platform | Build operator analytics + billing dashboard |
| $5k MRR | Consider dedicated infra team |

---

## Competitive Positioning

AgentPlayground is NOT competing with:
- General AI assistants (ChatGPT, Claude.ai) — they don't deploy to clients
- No-code AI platforms (Zapier AI, Make) — they don't do multi-agent delegation
- Enterprise AI (Salesforce Einstein, Microsoft Copilot) — wrong price point for LatAm SMBs

AgentPlayground IS competing with:
- The cost of hiring a part-time VA ($300–1,500/mo in Argentina)
- The time cost of doing admin manually
- SaaS tools that each solve one problem (Buffer for social, FreshBooks for billing, etc.)

**Differentiator:** One platform, one coordinator, all business functions — hosted by you, cheaper than a VA, smarter than a spreadsheet.

---

## Risk Watch (Business Team Should Monitor)

1. **API cost spiral**: Claude API costs can grow fast with heavy usage → flywheel must keep shifting work to local LLMs
2. **Monotributo category limit**: check quarterly that income stays within registered category
3. **Single-VPS bottleneck**: 16GB RAM limits how many concurrent clients we can serve → plan VPS upgrade when Phase 3 hits
4. **Over-promising**: don't commit to deliverables before checking agent team capacity
5. **Dependency on Anthropic**: if Claude API pricing changes significantly, local LLM routing must be ready to absorb more load
