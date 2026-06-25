# Team Directory — All Agent Teams

> Complete catalog of every team. Coordinator uses this to decide who to delegate to.
> Teams are seeded in `lib/seed-teams.ts` and `lib/seed-personal-teams.ts`.

---

## Core Platform Teams

### Dev Core
**Purpose:** Full-stack development of the AgentPlayground platform itself.  
**When to use:** Any code changes, new features, bug fixes, API routes, schema changes.  
**Agents:** Alex (lead/architecture), Sofia (React/frontend), Marcus (backend/API), Elena (database)  
**Skills:** Code Review, Feature Implementation, Bug Investigation  
**Stack knowledge:** Next.js 15, TypeScript, Prisma, PostgreSQL, NextAuth, Tailwind v4

Do NOT use for: infrastructure/DevOps, content, business strategy.

---

### DevOps & Infrastructure
**Purpose:** VPS management, Docker, deployment, server sizing, security.  
**When to use:** Deploy changes, check server health, resize VPS, configure nginx/Traefik, security audits.  
**Agents:** Viktor (Docker/deployment), Natasha (server architecture), Chen (security/auth)  
**Skills:** VPS Sizing & Cost Estimate, Docker Troubleshooting, Security Audit  
**Stack knowledge:** Docker Compose, Traefik, Hetzner, UFW, SSH

Do NOT use for: app-level code changes, business decisions.

---

### Product & Design
**Purpose:** Product strategy, UX design, QA, feature specs.  
**When to use:** "What should we build next?", UX review, writing feature specs, test plans.  
**Agents:** Aria (UI/UX design), James (product manager), Zoe (QA/testing)  
**Skills:** Feature Spec Writing, UX Review  
**Constraint:** No access to write code directly — creates specs for Dev Core to implement.

---

### Business & Growth
**Purpose:** Business strategy, client proposals, pricing, growth analysis, content.  
**When to use:** Client proposals, pricing decisions, blog posts, growth strategy, competitor analysis.  
**Agents:** (business-focused agents with sales/strategy system prompts)  
**Skills:** Proposal Writing, Market Analysis, Content Strategy  
**Access to:** `docs/context/business/` — reads all business context docs

---

## Personal OS Teams

### CV Advisory
**Purpose:** CV writing, professional positioning, interview prep.  
**When to use:** "Update my CV", "Prepare me for interview at X", "What should I add to my CV?"  
**Agents:** CV Writer, Interview Coach, LinkedIn Strategist  
**Data source:** `AgentMemory` key `cv_content` + `docs/context/personal/personal-profile.md`  
**Skills:** CV Section Writing, Interview Question Generator, LinkedIn Optimization

---

### Education & Learning
**Purpose:** Learning plans, resource curation, progress tracking, skill gap analysis.  
**When to use:** "I want to learn X", "Find me a course on Y", "What should I study next?"  
**Agents:** Research Agent, Quiz Agent, Learning Tracker  
**Data source:** `docs/context/personal/education-goals.md` + Brain (learning notes)  
**Skills:** Study Plan Creator, Resource Finder, Quiz Generator

---

### Financial Planner
**Purpose:** Income tracking, expense monitoring, budget planning, Monotributo limits.  
**When to use:** "How much have I earned this month?", "Am I close to my Monotributo limit?", "What are my API costs?"  
**Agents:** Income Tracker, Expense Analyzer, Budget Planner  
**Data source:** Brain (financial records) + `docs/context/business/04-billing-and-legal.md`  
**Warning:** Financial summaries only — not tax advice.

---

### Job Search
**Purpose:** Job hunting, application writing, outreach.  
**When to use:** "I want to apply to X", "Write me a cover letter for Y role", "Analyze this job posting"  
**Agents:** Job Scout, Application Writer, Outreach Drafter  
**Data source:** CV from Brain + `docs/context/personal/personal-profile.md`  
**Skills:** Job Fit Analysis, Cover Letter Writer, LinkedIn Outreach Message

---

### Fitness
**Purpose:** Workout planning, progress tracking, nutrition notes.  
**When to use:** "Create a workout plan", "Log my workout", "What should I do for legs today?"  
**Agents:** Workout Planner, Progress Tracker  
**Data source:** Brain (fitness logs)

---

## Demo / Temp Teams

### SensorGuard Integration
**Purpose:** Semester demo — industrial IoT monitoring system.  
**Status:** Live until 2026-06-19, then cleanup.  
**API routes:** `app/api/sensorguard/` — playground-chat, seed-team, telegram  
**Remove after:** 2026-06-19

---

## How to Choose the Right Team

| Task Type | Team |
|---|---|
| Write/fix application code | Dev Core |
| Deploy, Docker, server health | DevOps & Infrastructure |
| UX review, feature spec | Product & Design |
| Proposal, pricing, blog, strategy | Business & Growth |
| CV, interview, LinkedIn | CV Advisory |
| Learning plan, courses | Education & Learning |
| Income, expenses, budget | Financial Planner |
| Job application, cover letter | Job Search |
| Workout, fitness | Fitness |

When in doubt: start with the closest match. Teams can hand off research to each other via Brain.

---

## Teams That Don't Exist Yet (Build When Needed)

| Team | Purpose |
|---|---|
| Billing Monitor | Crypto payment detection + invoice matching |
| Client Chatbot | Deployed per client — 24/7 customer support |
| Social Media | Automated content creation + scheduling |
| Research Lab | Deep research tasks (multi-source, long-running) |
