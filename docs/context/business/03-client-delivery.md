# Client Delivery & Operations

> How we manage client relationships, onboard new clients, deliver work, and maintain quality.
> Used by Business & Growth team and coordinator when handling client-facing tasks.

---

## Client Lifecycle

### 1. Lead
- Comes in via: referral, blog post, LinkedIn, direct outreach
- First contact: coordinator handles initial reply
- Goal: understand what they need in under 3 messages

### 2. Proposal
- Business team drafts proposal based on client needs
- Proposal includes: which modules, pricing tier, timeline, what they'll receive
- Format: short (1 page max), concrete, with examples
- Send within 24 hours of first conversation

### 3. Onboarding
- Client pays → coordinator creates a Project in the Projects dashboard
- Onboarding checklist:
  - [ ] Create project entry (`create_project` tool)
  - [ ] Collect: business name, industry, target audience, brand tone, existing social accounts
  - [ ] Save client brief to Brain as `BrainDocument` (source: `client:[name]`)
  - [ ] Deploy any requested modules (chatbot, website scaffold)
  - [ ] Send welcome message with what to expect

### 4. Active Delivery
- Weekly: content agents produce deliverables, saved to Brain
- Monthly: accounting agent generates summary report
- Async: coordinator answers client questions, delegates urgent tasks
- All completed work logged to Project via `log_project_output`

### 5. Reporting
- Monthly summary sent to client: what was done, metrics, next month plan
- Format: Markdown → coordinator drafts → Augusto reviews → sends

### 6. Renewal / Upsell
- 30 days before renewal: coordinator flags upcoming renewal as PendingAction
- Business team reviews: did we deliver value? Any upsell opportunities?
- Renewal reminder to client with summary of value delivered

---

## Client Data Model

Each client maps to:
- **Project**: tracks status, milestones, outputs
- **BrainDocument(s)**: client brief, brand voice, content preferences
- **AgentMemory**: persistent facts about this client (avoid re-briefing)

Naming convention:
- Brain source: `client:[client-name]`
- Project name: `[ClientName] — [Service]`
- Memory key prefix: `client_[slug]_`

---

## Communication Standards

- Coordinator always responds in the client's language (Spanish for LatAm clients)
- Tone: professional but warm — not corporate, not casual
- Response time target: within 4 hours during business hours
- Never promise a deliverable without checking with the relevant agent team first
- If unsure: "Let me check and get back to you within [time]" — then `request_human_input` if needed

---

## Quality Checklist (Before Sending Any Deliverable)

- [ ] Does the output match the client's brand tone?
- [ ] Are there any factual claims that need verification?
- [ ] Is the format correct (Markdown → formatted, not raw)?
- [ ] Did we log this output to the Project?
- [ ] Did we save this to Brain for future reference?

---

## Escalation Protocol

If a client is unhappy or has a complaint:
1. `request_human_input` immediately — do not handle disputes autonomously
2. Document the complaint in Brain
3. Coordinator flags as high-priority PendingAction
4. Augusto reviews and responds personally

---

## Client Projects Currently Tracked

See `/projects` dashboard for live status. Coordinator can use `list_projects` and `get_project_status` to pull current state into any conversation.
