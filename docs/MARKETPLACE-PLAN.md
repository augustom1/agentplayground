# Agent Package Marketplace — Implementation Plan

> Status: **Planned — awaiting approval before building**
> Written: 2026-05-18
> Estimated effort: ~4-6h

---

## What It Is

A `/marketplace` page where users can browse and one-click install pre-built agent team packages.
Each package is a JSON bundle (agents + skills + CLI functions + instructions).
Premium packages are sold directly from the app (or as a landing page upsell).

---

## User Flow

1. User goes to `/marketplace` (or sees a banner on `/agent-lab`)
2. Browses packages by category: Dev, Marketing, Content, DevOps, Finance, etc.
3. Clicks "Install" on a package → one API call → team appears in their Agent Lab
4. Premium packages show a lock icon → redirects to billing/contact

---

## Package Format (JSON)

```json
{
  "packageId": "deploy-agent-v1",
  "name": "Deploy Agent Team",
  "description": "Deploys web apps to VPS via SSH. Handles Docker, nginx, SSL, and rollback.",
  "category": "DevOps",
  "price": 0,
  "version": "1.0.0",
  "tags": ["deploy", "docker", "vps", "ssh"],
  "team": {
    "name": "Deploy Team",
    "description": "Automated deployment pipeline",
    "agents": [
      {
        "name": "Deployer",
        "description": "Executes deployment commands via SSH",
        "model": "claude-sonnet-4-6",
        "systemPrompt": "You are a DevOps expert...",
        "capabilities": ["ssh", "docker", "nginx"]
      }
    ],
    "skills": [
      {
        "name": "Deploy App",
        "description": "Full deployment pipeline",
        "category": "DevOps",
        "prompt": "Deploy the app at {repo} to {server}..."
      }
    ],
    "cliFunctions": [
      {
        "name": "ssh-deploy",
        "command": "ssh -i $VPS_SSH_KEY root@{server} 'cd {path} && docker compose up -d --build'",
        "description": "Deploy via SSH",
        "dangerous": true
      }
    ]
  }
}
```

---

## Implementation Steps

### Step 1 — Package Registry (static JSON, no DB needed)

Create `data/packages/` directory with one JSON file per package:

```
data/packages/
  deploy-agent.json
  content-team.json
  seo-team.json
  research-team.json
  email-agent.json
  ...
```

### Step 2 — API Routes

**`GET /api/marketplace`** — returns list of all packages (reads `data/packages/`)

```typescript
// Returns: { packages: MarketplacePackage[] }
// Filters out premium packages if user has no credits/subscription
```

**`POST /api/marketplace/install`** — installs a package

```typescript
// Body: { packageId: string }
// Action: creates AgentTeam + Agents + Skills + CliFunctions
// Returns: { teamId: string }
```

### Step 3 — Marketplace Page (`/app/(app)/marketplace/page.tsx`)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Marketplace                    [Search...] [Category ▼] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FEATURED                                               │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 🚀 Deploy Team   │  │ ✍️ Blog Pipeline │            │
│  │ Free             │  │ Free             │            │
│  │ [Install]        │  │ [Install]        │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
│  DEVOPS                                                 │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │ 🔧 Infra Monitor │  │ 🐳 Docker Agent  │            │
│  │ Free             │  │ $9 Premium 🔒    │            │
│  │ [Install]        │  │ [Unlock]         │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Package card shows:**
- Name + icon (emoji or category icon)
- Description (1-2 lines)
- Agent count + skill count
- Price (Free / $X Premium)
- Tags
- Install button (spinner → success toast → "Go to Agent Lab" link)

### Step 4 — First 8 Packages to Build

| Package | Category | Price | Description |
|---|---|---|---|
| Deploy Agent | DevOps | Free | SSH deploy to VPS, Docker, rollback |
| Blog Pipeline | Content | Free | Draft → Review → Publish via vault |
| SEO Researcher | Marketing | Free | Keyword research, competitor analysis |
| Email Outreach | Marketing | $9 | Cold email sequences, follow-ups |
| Code Reviewer | Dev | Free | PR review, code quality, security scan |
| Research Assistant | Knowledge | Free | Web research → vault capture |
| Social Media Manager | Marketing | $9 | Multi-platform posting, scheduling |
| Finance Tracker | Business | $9 | Expense analysis, crypto portfolio |

### Step 5 — Sidebar Link

Add "Marketplace" link to `components/Sidebar.tsx` with a `ShoppingBag` or `Store` icon.

### Step 6 — Agent Lab Banner (optional)

Add a subtle banner at the top of `/agent-lab`:
```
✨ Browse pre-built agent packages in the Marketplace →
```

---

## Monetization Model

- **Free packages**: all users, builds trust and stickiness
- **Premium packages ($9-$29)**: one-time purchase OR included in paid plan
- **Custom packages**: sold as a service ("I'll build your custom agent team for $X")
- **White-label packages**: businesses buy a package + deployment on their own instance

---

## Database Changes Needed

None required for the basic implementation (JSON registry + existing import logic).

Optional future addition: `MarketplaceInstall` table to track which packages each user has installed (for analytics and re-install prevention).

---

## Files to Create/Modify

```
data/packages/                       ← NEW directory + 8 JSON files
app/(app)/marketplace/page.tsx       ← NEW marketplace UI
app/api/marketplace/route.ts         ← NEW GET handler (list packages)
app/api/marketplace/install/route.ts ← NEW POST handler (install package)
components/Sidebar.tsx               ← add Marketplace nav link
```

---

## Risks & Considerations

- **Import security**: The install endpoint reuses the existing import-team logic, which already validates the JSON shape. No exec/eval risk.
- **Duplicate teams**: If user installs twice, a second team is created (acceptable for now). Could add a check on `packageId` if tracking installs.
- **Premium gate**: For now, just show a "contact us" CTA for premium. Full payment gate comes in the billing phase.
- **Package versioning**: Start with a flat list. Add semver + changelogs when you have 20+ packages.
