# Playground Format Spec

> Updated: 2026-06-25  
> Previously called "Addons" — now unified under the "Playground" concept.  
> A Playground is the core product unit for both the marketplace and B2B deployments.

---

## What a Playground Is (as a package)

A Playground is a **packaged configuration** that adds pre-built agent teams, skills, and Brain seeds to an existing AgentPlayground installation. It is NOT a code change — it is a manifest the app imports.

The user downloads a Playground ZIP from the marketplace, runs the installer inside the app, and it creates the teams + agents + seeds the Brain. No Docker rebuild. No coding.

For B2B clients: a Playground is the same format, just built custom for them instead of a generic template.

---

## Playground ZIP Format

```
business-operations/
  playground.json          ← manifest
  teams/
    operations-team.json
    reporting-team.json
  skills/
    process-analysis.json
    doc-management.json
    report-writing.json
  brain-seeds/
    operations-methodology.md
    reporting-best-practices.md
  ui/
    template.json          ← optional: playground interface config
  README.md
```

### `playground.json` (manifest)
```json
{
  "id": "business-operations",
  "name": "Business Operations",
  "version": "1.0.0",
  "description": "Agent teams for document management, process automation, and status reporting",
  "author": "AgentPlayground",
  "price": 49,
  "free": false,
  "requires": "0.1.0",
  "category": "business",
  "teams": ["operations-team", "reporting-team"],
  "skills": ["process-analysis", "doc-management", "report-writing"],
  "brainSeeds": ["operations-methodology", "reporting-best-practices"],
  "ui": "template.json"
}
```

### `teams/operations-team.json`
```json
{
  "name": "Operations Team",
  "description": "Manages documents, tracks processes, answers operational questions",
  "agents": [
    {
      "name": "Process Analyst",
      "role": "Analyzes and documents business processes",
      "skills": ["process-analysis", "doc-management"],
      "model": "claude-sonnet-4-6"
    },
    {
      "name": "Doc Keeper",
      "role": "Organizes, retrieves, and summarizes company documents",
      "skills": ["doc-management"],
      "model": "claude-haiku-4-5-20251001"
    }
  ]
}
```

### `ui/template.json` (optional — for Playgrounds with a dedicated interface)
```json
{
  "layout": "dashboard",
  "name": "Business Operations Hub",
  "accentColor": "#D4715A",
  "features": ["agent-roster", "task-board", "chat", "knowledge-base"],
  "hideCoordinator": true
}
```

When `ui/template.json` is present, the installed Playground gets its own interface accessible at `/playground/[id]` — separate from the coordinator. When absent, the Playground just adds teams/skills/brain docs to the existing app with no custom UI.

---

## Install API

```typescript
// app/api/playgrounds/install/route.ts
POST /api/playgrounds/install
Content-Type: multipart/form-data
Body: { file: <playground.zip>, licenseKey?: <key> }

→ 200 { installed: true, playgroundId: "...", teams: [...], skills: [...], brainDocs: [...] }
→ 400 { error: "Invalid license key" }
→ 409 { error: "Playground already installed" }
```

**What it does:**
1. If `licenseKey` present: validates against agentplayground.net `/api/validate`
2. Extracts ZIP in memory
3. Reads `playground.json`
4. Creates teams + agents in DB
5. Creates skills in DB
6. Upserts Brain documents from `brain-seeds/`
7. If `ui/template.json` present: creates a Playground config record in DB
8. Records in `InstalledPlayground` table

### Schema additions
```prisma
model InstalledPlayground {
  id           String   @id @default(cuid())
  playgroundId String   @unique   // "business-operations"
  version      String
  licenseKey   String?
  installedAt  DateTime @default(now())
}

model PlaygroundConfig {
  id          String   @id @default(cuid())
  playgroundId String  @unique
  name        String
  accentColor String   @default("#D4715A")
  features    String[] // ["agent-roster", "task-board", "chat", "knowledge-base"]
  teamIds     String[] // which teams are exposed in this playground's interface
  createdAt   DateTime @default(now())
}
```

---

## Marketplace Page

On `agentplayground.net/playgrounds`:
- Grid of Playground cards: name, description, category, price (or "Free"), agent count
- Filter by: category, price (free / paid), author
- Each card: preview of agents included + what the Playground does
- "Download" (free) or "Buy" (paid) → Stripe → download link + license key emailed

In the app (`Settings → Playgrounds`):
- List of installed Playgrounds with version
- "Install from file" button (for manual installs or B2B custom builds)
- "Browse Marketplace" link

---

## Building a New Playground

1. Define the use case + target user
2. Design agent team structure (2-4 agents per team, 1-3 teams)
3. Write system prompts for each agent
4. Write skills (tool access each agent has)
5. Create 2-3 Brain seed docs (methodology, best practices, reference material)
6. Optionally: design the UI template (which features to show, name, color)
7. Package into ZIP with `playground.json` manifest
8. Test via `/api/playgrounds/install` locally
9. Add to marketplace listing on the website
10. Generate Stripe product + price (if paid)

Steps 2-6 can largely be done by your coordinator given a use case description.

---

## B2B Custom Playgrounds

When a business client buys a custom Playground build:
1. 30-min discovery call — you take notes into the Brain
2. Your coordinator drafts the team + agent configs from the call notes
3. You review + approve
4. Package into ZIP
5. Client installs it on their AgentPlayground instance (self-hosted)
   — OR you deploy it on their hosted instance (shared or dedicated VPS)

Custom builds always include `ui/template.json` with the client's name, colors, and only the features they need — so their employees see a purpose-built interface, not the full coordinator.

---

## Planned Catalog

### Free (launch with these — build audience)
| Playground | Agents | BYOK |
|---|---|---|
| Personal Research | Researcher, Summarizer | Anthropic/Ollama |
| Daily Briefing | News Analyst, Digest Writer | Anthropic/Ollama |
| Code Review | Code Reviewer, Architecture Advisor | Anthropic/Ollama |

### Paid — Priority 1
| Playground | Agents | Price |
|---|---|---|
| Business Operations | Process Analyst, Doc Keeper, Report Writer | $49 |
| Marketing Suite | Content Writer, SEO Researcher, Social Scheduler | $49 |
| Sales Outreach | Prospect Finder, Email Writer, Follow-up Manager | $49 |

### Paid — Priority 2
| Playground | Agents | Price |
|---|---|---|
| Legal Research | Legal Researcher, Contract Reviewer, Case Analyst | $99 |
| HR Recruitment | Job Post Writer, CV Screener, Policy Advisor | $79 |
| Financial Analysis | Market Researcher, Report Writer, Data Analyst | $99 |

---

## Delivering Updates

When a Playground gets a new version:
1. Generate a new ZIP, bump `version` in `playground.json`
2. Update the marketplace listing
3. App checks for updates on startup → notifies user if newer version available
4. User installs update from the same "Install from file" flow — installer detects newer version and upgrades

For hosted B2B clients: push the update as part of their monthly maintenance.
