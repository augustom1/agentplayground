# AgentPlayground — 10 Session Build Plan

> Updated: 2026-06-25  
> Paste the prompt for each session at the START of a fresh Claude Code session.  
> Work through them in order. Update HANDOFF.md at the end of every session.

---

## PHASE 1 — Ship the app (Sessions 0–6)
Goal: a working downloadable app your friends can install and use with their OpenAI API key.

---

## SESSION 0 — Sensorguard Cleanup
**~30 min. Do this first — it unblocks everything.**

```
Read HANDOFF.md first.

Clean up the sensorguard demo branch before starting any new work.

1. Checkout master branch (we are on feature/sensorguard-demo)
2. Delete the feature/sensorguard-demo branch locally and remotely
3. Remove GuardTech files from VPS via SSH:
   - /root/opt/vps/sites/guardtech.conf
   - /root/opt/vps/webroot/guardtech/ (entire directory)
4. Remove GuardTech Traefik labels from docker-compose.prod.yml
5. Remove any SensorGuard-specific API routes:
   - Check app/api/sensorguard/ — delete if it exists
   - Check app/api/admin/seed-skills/ — delete only if it was demo-only (not general purpose)
6. Check HANDOFF.md for any other sensorguard/guardtech references and remove them
7. Run npm run build locally to verify clean build
8. Deploy: scp changed files to VPS, rebuild dashboard container (use --no-cache since we deleted directories)
9. Verify app.agentplayground.net loads and works after cleanup
10. Update HANDOFF.md: remove the sensorguard section, note cleanup done, note we are starting the desktop app pivot

Done when: master is clean, VPS has no guardtech traces, app.agentplayground.net is healthy.
```

---

## SESSION 1 — Nav Cleanup + API Keys Settings + Version Endpoint
**~2-3 hrs. Cleans up the UI for non-technical users and adds infrastructure for the desktop app.**

```
Read HANDOFF.md and docs/pivot/00-OVERVIEW.md before starting.

Three tasks this session.

--- TASK 1: Hide personal pages from non-admin users ---
Find the sidebar/nav component. These pages should only render their nav link when session.user.role === 'admin':
- /cv
- /learn
- /notes
- /connect (if in nav)
- /overview
- /stack
- /admin (already likely gated — confirm it stays admin-only)

Do NOT delete these pages — just hide the nav links. All other pages stay visible to all authenticated users.

--- TASK 2: API Keys settings page ---
Create or update the Settings page so ANY user can add and change their API keys through the UI — not just through .env.local.

Find the settings page (likely app/(app)/settings/ or similar). Add an "API Keys" section:
- Anthropic API Key (password input, masked)
- OpenAI API Key (password input, masked)
- A note: "Your keys are stored locally and used only for your agent conversations."
- Save button → POST to /api/settings/api-keys

Create app/api/settings/api-keys/route.ts:
  POST — body: { anthropicKey?: string, openaiKey?: string }
  - Upsert each key into AgentMemory table: { key: "ANTHROPIC_API_KEY", value: <key>, scope: "system" }
  - Return 200

Update the chat route (app/api/chat/route.ts) and any provider initialization:
- If process.env.ANTHROPIC_API_KEY is not set, check AgentMemory for key "ANTHROPIC_API_KEY"
- Same for OPENAI_API_KEY
- This means a fresh install with no .env.local can still work if the user enters keys in Settings

Also update app/api/settings/api-keys/route.ts with a GET handler that returns whether each key is set (true/false — never return the actual key value).

--- TASK 3: License model + version endpoint ---
Add to prisma/schema.prisma:
  model License {
    id         String    @id @default(cuid())
    key        String    @unique
    plan       String    // "community" | "custom-build" | "vps-hosted"
    userEmail  String
    expiresAt  DateTime?
    createdAt  DateTime  @default(now())
  }

Create app/api/version/route.ts:
  GET /api/version — no auth required
  Returns: { version: "0.1.0", downloadUrl: "", changelog: "Initial release" }

Create app/admin/licenses/page.tsx (admin only):
- List all licenses
- Form to create: plan, userEmail, expiresAt (optional)
- Auto-generate key as crypto.randomUUID() on creation
- Button to delete/revoke a license
- No pagination needed yet

--- TASK 4: Deploy ---
1. npx prisma db push on VPS (after scp'ing schema)
2. Deploy all changed files to VPS, rebuild container
3. Verify as non-admin user: /cv, /notes, /learn, /overview not visible in nav
4. Verify: GET https://app.agentplayground.net/api/version returns JSON
5. Verify: /admin/licenses page loads for admin user
6. Update HANDOFF.md

Done when: nav is clean for non-admin users, API keys can be set in Settings UI, version endpoint works.
```

---

## SESSION 2 — First-Run Wizard
**~2-3 hrs. The first thing a friend sees when they open the app.**

```
Read HANDOFF.md and docs/pivot/02-BASE-APP.md (First-Run Setup Wizard section) before starting.

Build a first-run setup wizard. When a fresh install starts with no users in the database, show /setup instead of the login page.

--- TASK 1: Detection middleware ---
In middleware.ts:
- For any request to the app (not /api, not /setup, not public assets, not /_next):
  - If the cookie "setup_complete" is NOT set:
    - Make a lightweight DB check: count users
    - If 0 users: redirect to /setup
    - If users exist: set cookie "setup_complete=1; path=/; max-age=31536000" and continue
  - If the cookie IS set: skip the check entirely (performance)

The DB check must be lightweight. Use a Prisma count query. Cache with the cookie so it never runs again after setup.

--- TASK 2: /setup wizard ---
Create app/setup/ route group (no auth required — middleware must bypass /setup routes).
Create app/setup/page.tsx as a 5-step wizard. Use local React state (no URL per step).

IMPORTANT design: clean, welcoming, matches the design system (charcoal #1a1a1a background, rust #D4715A accent). Not the coordinator UI — this is an onboarding screen.

Step 1 — Welcome
  Heading: "Welcome to AgentPlayground"
  Subtext: "Your personal AI agent platform. Set up takes about 2 minutes."
  Button: [Get Started →]

Step 2 — API Keys
  Heading: "Connect your AI provider"
  Subtext: "AgentPlayground works with Anthropic Claude, OpenAI, or free local models via Ollama."
  
  Three provider cards (single select, default: OpenAI):
  
  Card A — OpenAI (recommended for most users)
    "Works with GPT-4o and GPT-4o mini. Get a key at platform.openai.com — cheap for everyday use."
    Input: OpenAI API Key [password field]
    Link: "Get a free key →" → https://platform.openai.com/api-keys
  
  Card B — Anthropic Claude
    "Works with Claude Sonnet and Haiku. Get a key at console.anthropic.com."
    Input: Anthropic API Key [password field]
    Link: "Get a free key →" → https://console.anthropic.com
  
  Card C — Ollama (local, free)
    "Runs AI models on your computer. No API costs, but requires more RAM."
    Note: "Ollama will be detected automatically if running on your machine."
    No input needed — just select this option.
  
  User can select multiple. At least one must be selected to proceed.
  Keys are saved to AgentMemory on wizard completion (not yet — collect in wizard state).

Step 3 — Create Your Account
  Heading: "Create your account"
  Subtext: "This is your local owner account — stored only on your machine."
  Fields: Name, Email, Password, Confirm Password
  This creates the first user with role="admin"
  POST to a new endpoint: POST /api/setup/create-account
    - Validates no users exist yet (security check)
    - Creates user with role="admin"
    - Returns a session or signs them in automatically

Step 4 — Choose a Starter
  Heading: "What will you use AgentPlayground for?"
  Four cards (single select):
    ○ Personal — "Trainer, nutritionist, finance advisor, schedule manager"
    ○ Business — "Operations, sales, content, and client management agents"  
    ○ Development — "Code review, architecture, and documentation agents"
    ○ Blank — "Start with just the coordinator, add teams yourself"
  
  Selection stored in wizard state.

Step 5 — Done
  Show a brief summary of what was set up.
  Button: [Open AgentPlayground →]
  
  On clicking: 
    - POST /api/setup/complete with { apiKeys, starterPack }
    - This endpoint: saves API keys to AgentMemory, seeds the starter teams, sets "setup_complete" cookie
    - Sign the user in (create NextAuth session)
    - Redirect to /chat or /dashboard

--- TASK 3: Setup API endpoints ---
Create app/api/setup/create-account/route.ts:
  POST — body: { name, email, password }
  - Verify 0 users exist (reject if any user exists — prevent abuse)
  - Hash password with bcrypt
  - Create user with role="admin"
  - Return { success: true }

Create app/api/setup/complete/route.ts:
  POST — body: { apiKeys: { openai?, anthropic? }, starterPack: string }
  - Must be called right after create-account (session must exist)
  - Save each API key to AgentMemory (key: "OPENAI_API_KEY" or "ANTHROPIC_API_KEY", scope: "system")
  - Seed the selected starter teams (call existing seed logic with the selected pack name)
  - Set "setup_complete" cookie in the response
  - Return { success: true }

--- TASK 4: Test ---
Clear local DB (or use a fresh Docker volume). Run npm run dev. Visit localhost:3000.
Verify: redirected to /setup. Complete all steps. Verify: land in coordinator with starter teams seeded.
Verify: /setup is NOT accessible after setup is complete (redirects to / or /chat).

Update HANDOFF.md.

Done when: fresh install shows the wizard, completing it creates an admin account with the right teams seeded and drops into the main app.
```

---

## SESSION 3 — Playground Dashboard
**~2-3 hrs. The organizational view — groups your agents by context.**

```
Read HANDOFF.md and docs/pivot/06-PLAYGROUND-PLATFORM.md before starting.

Build the Playground feature. A Playground is an organizational container that groups agent teams by context (Personal Life, Business, Education). It shows a standard dashboard — same template for every Playground. Not a custom UI, just an organized view of what's inside.

--- TASK 1: Playground model ---
Add to prisma/schema.prisma:
  model Playground {
    id        String   @id @default(cuid())
    name      String
    icon      String?  // emoji or icon name
    color     String?  // accent color hex
    teamIds   String[] // IDs of teams included in this playground
    userId    String
    user      User     @relation(fields: [userId], references: [id])
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }

Run npx prisma generate.

--- TASK 2: Playground API routes ---
Create app/api/playgrounds/route.ts:
  GET — list all playgrounds for current user, include basic team data for each teamId
  POST — body: { name, icon?, color?, teamIds? } → create playground

Create app/api/playgrounds/[id]/route.ts:
  GET — get one playground with full team + agent data
  PATCH — update name, icon, color, teamIds
  DELETE — delete playground (does NOT delete the teams — just the container)

--- TASK 3: Playground sidebar section ---
In the sidebar nav, add a "Playgrounds" section below the existing nav items.
- A collapsible section header "Playgrounds" with a + icon to create one
- Lists all the user's playgrounds, each as a nav link: icon + name
- Clicking one navigates to /playground/[id]
- The + icon opens a quick-create modal: enter name, pick an icon/emoji, select teams to include

Keep it simple. No drag-and-drop, no complex UI. Just a list.

--- TASK 4: Playground dashboard page ---
Create app/(app)/playground/[id]/page.tsx:

This is the main content area when a Playground is selected. Same layout for every Playground — no customization here.

Layout (use CSS grid or flex — clean and spacious):

┌─────────────────────────────────────────────────────┐
│  [Icon] Playground Name              [Edit] [Delete] │
├───────────────────┬─────────────────────────────────┤
│  AGENTS           │  ACTIVE TASKS                   │
│  ─────────────    │  ──────────────────────────────  │
│  [Agent cards]    │  [Task list from DB]            │
│  Name + role +    │  Each: title, team, status      │
│  status dot       │                                 │
├───────────────────┼─────────────────────────────────┤
│  SKILLS           │  RECENT COMPLETIONS             │
│  ─────────────    │  ──────────────────────────────  │
│  Skill tags for   │  Last 5 completed tasks         │
│  all teams        │  from teams in this playground  │
└───────────────────┴─────────────────────────────────┘

Data to fetch:
- Teams: GET /api/teams?ids=[teamIds from playground]
- Agents: from the teams data
- Skills: from the agents data  
- Tasks: GET /api/tasks?teamIds=[teamIds]&status=running,pending (for Active Tasks)
- Recent: GET /api/tasks?teamIds=[teamIds]&status=completed&limit=5 (for Recent Completions)

If teams API doesn't support filtering by ids: fetch all teams and filter client-side for now.

Agent card component (simple):
  [Initial avatar]  Name
                    Role (one line, truncated)
                    Status: ● idle / ● running / ● waiting

--- TASK 5: Create Playground flow ---
When the user clicks + in the sidebar Playgrounds section:
- Open a modal (use existing modal pattern in the codebase)
- Fields: Name (text), Icon (emoji picker or simple emoji text input), Teams (multi-select of existing teams)
- Submit → POST /api/playgrounds → add to sidebar, navigate to the new playground

On first visit to /playground if user has no playgrounds: show an empty state with a button to create the first one. Empty state text: "Create a Playground to organize your agent teams by context — work, personal, education."

--- TASK 6: Deploy ---
1. npx prisma db push on VPS
2. scp changed files, rebuild container
3. Test: create a playground, add teams, verify dashboard shows agents + tasks
4. Update HANDOFF.md

Done when: user can create a Playground, add their teams to it, and see a clean dashboard of agents, active tasks, skills, and recent completions.
```

---

## SESSION 4 — Docker Packaging (Ollama Optional)
**~2-3 hrs. The ZIP your friends download and run. Ollama is opt-in, not default.**

```
Read HANDOFF.md and docs/pivot/03-INSTALLER.md before starting.

Package the app as a standalone Docker distribution. Important: Ollama is NOT included by default — it uses too much RAM. Users who want local AI can opt in separately.

--- TASK 1: Standalone docker-compose.yml ---
Create docker/docker-compose.yml:

services:
  app:
    image: agentplayground/app:latest
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    env_file:
      - .env.local
    environment:
      DATABASE_URL: postgresql://agentplayground:agentplayground@postgres:5432/agentplayground
      REDIS_URL: redis://redis:6379
      NEXTAUTH_URL: http://localhost:3000
    volumes:
      - app_data:/app/data
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: agentplayground
      POSTGRES_PASSWORD: agentplayground
      POSTGRES_DB: agentplayground
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agentplayground"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  app_data:
  postgres_data:
  redis_data:

(NO Ollama service here — it's in a separate optional file)

--- TASK 2: Optional Ollama compose ---
Create docker/docker-compose.ollama.yml (users add this with --file flag if they want local models):

services:
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

  app:
    environment:
      OLLAMA_BASE_URL: http://ollama:11434

volumes:
  ollama_data:

Add a comment in .env.example: "To use Ollama (local AI), run: docker compose -f docker-compose.yml -f docker-compose.ollama.yml up -d"

--- TASK 3: .env.example ---
Create docker/.env.example:

  # Add at least one API key. Get a free key at platform.openai.com or console.anthropic.com
  OPENAI_API_KEY=
  ANTHROPIC_API_KEY=
  
  # Required — generate any random 32+ character string here
  AUTH_SECRET=replace-this-with-a-random-32-character-string
  
  # Leave these as-is
  NEXTAUTH_URL=http://localhost:3000
  
  # Optional — only needed if you run docker-compose.ollama.yml
  # OLLAMA_BASE_URL=http://ollama:11434

--- TASK 4: Launch scripts ---

Create docker/start.bat (Windows):
@echo off
setlocal
echo Starting AgentPlayground...

if not exist .env.local (
  copy .env.example .env.local
  echo.
  echo SETUP NEEDED:
  echo Open the .env.local file and add your API key.
  echo Get a free OpenAI key at: https://platform.openai.com/api-keys
  echo Then run start.bat again.
  echo.
  pause
  exit /b 1
)

docker compose up -d
echo.
echo Waiting for AgentPlayground to start...
timeout /t 10 /nobreak >nul
start http://localhost:3000
echo AgentPlayground is running at http://localhost:3000
echo Run stop.bat to shut it down.
endlocal

Create docker/stop.bat:
@echo off
docker compose down
echo AgentPlayground stopped.

Create docker/start.sh (Mac/Linux):
#!/bin/bash
set -e
echo "Starting AgentPlayground..."

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo ""
  echo "SETUP NEEDED:"
  echo "Open .env.local and add your API key."
  echo "Get a free OpenAI key at: https://platform.openai.com/api-keys"
  echo "Then run ./start.sh again."
  echo ""
  exit 1
fi

docker compose up -d
echo ""
echo "Waiting for AgentPlayground to start..."
sleep 10

if command -v open &>/dev/null; then
  open "http://localhost:3000"
elif command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:3000"
fi

echo "AgentPlayground is running at http://localhost:3000"
echo "Run ./stop.sh to shut it down."

Create docker/stop.sh:
#!/bin/bash
docker compose down
echo "AgentPlayground stopped."

chmod +x the .sh files.

--- TASK 5: INSTALL.md ---
Create INSTALL.md at the project root:

# Installing AgentPlayground

## Requirements
- Docker Desktop 4.x or later — download at docker.com/products/docker-desktop
- 4GB RAM minimum (8GB recommended)
- 5GB free disk space

## Steps

1. **Install Docker Desktop** if you haven't already (link above)

2. **Extract this ZIP** to any folder on your computer

3. **Get an API key** — you need at least one:
   - OpenAI (recommended): platform.openai.com → API keys (free to sign up, pay per use — cheap)
   - Anthropic: console.anthropic.com → API keys

4. **Add your key** — open `.env.local` in a text editor and paste your key:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

5. **Start the app**:
   - Windows: double-click `start.bat`
   - Mac/Linux: open Terminal, run `./start.sh`

6. **Open your browser** to http://localhost:3000 — the setup wizard will guide you through the rest.

## Stopping the app
Run `stop.bat` (Windows) or `./stop.sh` (Mac/Linux), or use Docker Desktop.

## Using local AI (Ollama)
Want to run AI models locally for free (no API costs)?
Run: `docker compose -f docker-compose.yml -f docker-compose.ollama.yml up -d`
Then select "Ollama" in the setup wizard. Note: requires 8GB+ RAM.

--- TASK 6: Update entrypoint.sh ---
Ensure the app container entrypoint runs on startup:
1. npx prisma generate
2. npx prisma db push --accept-data-loss (idempotent — safe to run on every start)
3. node server.js

Verify this is in the Dockerfile and entrypoint.sh.

--- TASK 7: Test end-to-end locally ---
1. Build Docker image: docker build -t agentplayground/app:latest .
2. cd into docker/ folder (simulate a user's extracted ZIP)
3. Copy .env.example to .env.local, add a real API key
4. Run: docker compose up -d
5. Wait ~15 seconds, open http://localhost:3000
6. Verify: first-run wizard appears
7. Complete wizard (pick OpenAI, create account, pick Personal starter)
8. Send a message to the coordinator
9. Fix any issues found
10. docker compose down

Update HANDOFF.md.

Done when: fresh Docker install from the docker/ folder opens the wizard, user can set up and chat in under 5 minutes.
```

---

## SESSION 5 — Download Page + Website
**~2-3 hrs. agentplayground.net becomes the place where you send the download link.**

```
Read HANDOFF.md and docs/pivot/04-WEBSITE.md before starting.

Build the public website at agentplayground.net. The VPS already hosts app.agentplayground.net — we add a (marketing) route group to the same Next.js app and route the bare domain via Traefik.

--- TASK 1: Traefik routing ---
In docker-compose.prod.yml, add these Traefik labels to the dashboard service (alongside existing labels):
  - "traefik.http.routers.marketing.rule=Host(`agentplayground.net`) || Host(`www.agentplayground.net`)"
  - "traefik.http.routers.marketing.entrypoints=websecure"
  - "traefik.http.routers.marketing.tls.certresolver=letsencrypt"
  - "traefik.http.routers.marketing-http.rule=Host(`agentplayground.net`) || Host(`www.agentplayground.net`)"
  - "traefik.http.routers.marketing-http.entrypoints=web"
  - "traefik.http.routers.marketing-http.middlewares=redirect-https@docker"

DNS: agentplayground.net A record should point to 95.217.163.247 (same VPS as the app). Add this DNS record if not already done.

--- TASK 2: Marketing layout ---
Create app/(marketing)/layout.tsx:
- No auth required (fully public, no middleware auth check)
- Header: AgentPlayground logo (rust asterisk + name) + nav links [Download] [GitHub ↗] + a subtle [Sign in] link
- Footer: "AgentPlayground — Free and open source" + GitHub link + email
- Use existing design tokens: charcoal bg, rust accent, same globals.css
- No sidebar

--- TASK 3: Homepage ---
Create app/(marketing)/page.tsx:

Section 1 — Hero:
  H1: "Run your own AI agent teams."
  Subtext: "Free, local, and open-source. AgentPlayground gives you a coordinator, specialized agent teams, a knowledge brain, and organized Playgrounds — running on your computer in minutes."
  CTAs: [Download Free] → /download   [View on GitHub] → github
  Small note below: "Runs on Docker Desktop. Works with OpenAI, Anthropic, or free local models."

Section 2 — Three features (icon + title + 1-line description):
  "Agent teams"      — Not just prompts. Real teams with skills, memory, and a coordinator.
  "Playgrounds"      — Organize your agents by context: work, personal, education.
  "Your data"        — Everything runs locally. No cloud account, no subscriptions.

Section 3 — How it works (numbered, plain language):
  1. Download and run with Docker
  2. Enter your API key (OpenAI or Anthropic) — takes 2 minutes
  3. Create agent teams and start delegating work

Section 4 — Minimal footer CTA:
  "Ready to try it?" [Download AgentPlayground →]

--- TASK 4: Download page ---
Create app/(marketing)/download/page.tsx:

- H1: "Download AgentPlayground"
- Subtext: "Free. No account. No subscription. Just Docker."
- Version badge: fetched from /api/version at runtime
- Download button: [Download v0.1.0] (link to the GitHub release ZIP — update when real URL exists, use # for now)
- Requirements (keep it short):
    Docker Desktop 4.x+ (link to docker.com)
    Windows 10+ / macOS 12+ / Ubuntu 20.04+
    4GB RAM minimum
- Install steps (numbered, plain):
  1. Install Docker Desktop
  2. Extract the ZIP
  3. Open .env.local, add your API key (get one free at platform.openai.com)
  4. Run start.bat (Windows) or ./start.sh (Mac/Linux)
  5. Open http://localhost:3000
- Getting your API key section:
  OpenAI (recommended): platform.openai.com/api-keys — free to sign up, pay per use
  Anthropic: console.anthropic.com — same model

--- TASK 5: SEO + llms.txt ---
Add next/metadata to each marketing page (title, description, openGraph).

Create public/llms.txt:
  # AgentPlayground
  Free, open-source AI agent platform. Runs locally via Docker.
  
  What it does: coordinator delegates to agent teams, Brain stores knowledge with semantic search, supports Claude + OpenAI + Ollama, Playgrounds organize agents by context.
  
  Download: https://agentplayground.net/download
  GitHub: https://github.com/[your-org]/agentplayground
  Contact: hello@agentplayground.net

Create public/robots.txt:
  User-agent: *
  Allow: /
  User-agent: GPTBot
  Allow: /
  User-agent: ClaudeBot
  Allow: /
  Sitemap: https://agentplayground.net/sitemap.xml

Create app/sitemap.ts returning: /, /download

--- TASK 6: Deploy ---
1. scp all changed files to VPS
2. Update docker-compose.prod.yml with the new Traefik labels
3. Rebuild dashboard container
4. Test: https://agentplayground.net loads the homepage
5. Test: https://agentplayground.net/download loads the download page
6. Test: https://app.agentplayground.net still works
7. Test: https://agentplayground.net/llms.txt serves plain text

Update HANDOFF.md.

Done when: agentplayground.net is live with homepage + download page.
```

---

## SESSION 6 — Polish + First Release
**~2-3 hrs. End-to-end test, fix everything, prepare the download link to send to friends.**

```
Read HANDOFF.md. This session finalizes the app for the first real users — your friends.

--- TASK 1: End-to-end fresh install test ---
Simulate exactly what a friend will do:
1. Remove existing local Docker volumes (fresh state)
2. Go to the docker/ folder
3. Copy .env.example to .env.local
4. Add a real OpenAI API key to .env.local
5. Run start.bat or ./start.sh
6. Navigate to http://localhost:3000
7. Complete the setup wizard using OpenAI as the provider, "Personal" as the starter pack
8. Verify: coordinator loads, teams are seeded
9. Send a message: "What can you help me with?"
10. Verify the response makes sense and streams correctly
11. Create a Playground called "Personal Life", add the Personal teams
12. Verify the Playground dashboard shows agents and is usable
13. Write down every friction point, confusion, or bug

--- TASK 2: Fix all issues found ---
Fix everything from Task 1. Priority order:
1. Anything that breaks the flow (crashes, blank screens, DB errors)
2. Anything confusing in the wizard
3. UI issues in the Playground dashboard
4. Text that sounds too technical for a non-developer friend

--- TASK 3: Settings polish ---
Make sure a friend can change their API key after setup:
- Settings → API Keys: verify the page works, shows "Key saved" confirmation
- If they enter a wrong key: the error from the AI provider should surface in chat, not silently fail
- In the chat route: if the AI call fails due to an invalid API key, return a clear message: "Your API key appears to be invalid. Go to Settings → API Keys to update it."

--- TASK 4: README.md ---
Rewrite the project README.md as the public-facing GitHub readme:

  # AgentPlayground
  
  Run your own AI agent teams, locally and for free.
  
  [screenshot placeholder — add a screenshot of the main UI]
  
  ## What is it?
  AgentPlayground is a local AI agent platform. You set up agent teams (a coordinator delegates work to specialized agents), build a knowledge Brain, and organize everything into Playgrounds by context.
  
  Works with OpenAI (GPT-4o), Anthropic (Claude), or free local models via Ollama.
  
  ## Quick Start
  1. Install Docker Desktop (docker.com)
  2. Download the latest release from agentplayground.net/download
  3. Add your OpenAI or Anthropic API key to .env.local
  4. Run start.bat (Windows) or ./start.sh (Mac/Linux)
  5. Open http://localhost:3000
  
  ## Features
  - Coordinator that delegates to specialized agent teams
  - Knowledge Brain with semantic search
  - Playgrounds: organize agents by context (work, personal, education)
  - Plans: create a goal, council reviews it, agents execute
  - Works with OpenAI, Anthropic, and Ollama
  
  ## Requirements
  Docker Desktop 4.x+, 4GB RAM minimum.
  
  ## License
  MIT

--- TASK 5: Update /api/version ---
Update app/api/version/route.ts to return:
  {
    version: "0.1.0",
    downloadUrl: "https://agentplayground.net/download",
    changelog: "First release — agent teams, Playground dashboards, first-run wizard"
  }

--- TASK 6: Build release ZIP ---
Create docker/build-release.sh:
  #!/bin/bash
  VERSION="0.1.0"
  FOLDER="agentplayground-v${VERSION}"
  mkdir -p "$FOLDER"
  cp docker/docker-compose.yml "$FOLDER/"
  cp docker/docker-compose.ollama.yml "$FOLDER/"
  cp docker/.env.example "$FOLDER/"
  cp docker/start.bat "$FOLDER/"
  cp docker/start.sh "$FOLDER/"
  cp docker/stop.bat "$FOLDER/"
  cp docker/stop.sh "$FOLDER/"
  cp INSTALL.md "$FOLDER/"
  chmod +x "$FOLDER/start.sh" "$FOLDER/stop.sh"
  zip -r "${FOLDER}.zip" "$FOLDER"
  rm -rf "$FOLDER"
  echo "Created ${FOLDER}.zip"

--- TASK 7: Deploy final changes to VPS ---
1. scp all remaining changes
2. Rebuild container
3. Verify app.agentplayground.net and agentplayground.net both work

--- TASK 8: Checklist for releasing (output as a list the user can follow manually) ---
Print this checklist:
  □ Build and push Docker image: docker build -t agentplayground/app:0.1.0 . && docker push agentplayground/app:0.1.0 && docker tag agentplayground/app:0.1.0 agentplayground/app:latest && docker push agentplayground/app:latest
  □ Run: bash docker/build-release.sh → generates agentplayground-v0.1.0.zip
  □ Create GitHub repository: github.com → New repo named "agentplayground" → public
  □ Push code: git remote add origin <repo-url> && git push -u origin master
  □ Create GitHub Release v0.1.0 → upload agentplayground-v0.1.0.zip
  □ Update downloadUrl in /api/version to the GitHub release download URL
  □ Deploy the /api/version update to VPS
  □ Test: download the ZIP yourself, extract, run start.bat, verify the wizard works
  □ Send the agentplayground.net/download link to your first friend

Update HANDOFF.md. Mark Phase 1 (Sessions 0-6) as complete.

Done when: release ZIP is ready, the download link sends someone to a working app.
```

---

## PHASE 2 — Playground Platform Restructure (Sessions 7–10)
Goal: rebuild the app around Playgrounds as self-contained mini-app environments before friends test it.
Read `docs/pivot/09-PLATFORM-VISION.md` before starting any session in this phase.

**Timeline target:** Complete Sessions 7–10 by end of June / start of July, then do the GitHub release.

---

## SESSION 7 — Navigation Restructure
**~3-4 hrs. The biggest visual change. Makes the app feel intentional instead of cluttered.**

```
Read HANDOFF.md and docs/pivot/09-PLATFORM-VISION.md before starting.

The current sidebar has 3 tabs (Chat / Teams / Brain) each with many sub-pages. This is confusing.
Replace it with a flat, intentional structure: Chat at the top, Playgrounds as the main section, Overview as a global dashboard.

--- TASK 1: New sidebar structure ---
Rewrite components/Sidebar.tsx.

Remove the 3-tab pill box (Chat / Teams / Brain) entirely.

New structure from top to bottom:
  [Logo row] → links to /chat

  [New Chat button] → /chat

  SECTION: Main
    Chat          → /chat       (MessageSquare icon)
    Overview      → /overview   (LayoutGrid icon)

  SECTION: Playgrounds  (with + button to create)
    [list of user's playgrounds, each as a nav link to /playground/[id]]
    If no playgrounds: "+ Create your first Playground" prompt
    Collapsed sidebar: show playground icons only

  Bottom: [User menu] (same as now)
  Settings accessible from user menu only (not in main nav)

The following pages are REMOVED from the sidebar permanently (they are accessible from within
playgrounds or from the admin panel, not from global nav):
  /pipeline, /executor, /agent-lab, /tools, /connect, /optimize, /overview (old how-it-works),
  /plans, /actions, /projects, /schedule, /server, /websites, /blog, /billing,
  /notes, /cv, /learn, /files, /brain

Do NOT delete these page files — just remove them from the sidebar nav.
The admin hamburger menu (⋯) keeps: Settings, Admin (if admin role), Users (if admin role).

--- TASK 2: Rename /spaces/[id] → /playground/[id] ---
The existing playground dashboard is at app/(app)/spaces/[id]/page.tsx.
Move it to app/(app)/playground/[id]/page.tsx.

IMPORTANT slug conflict check: there is an existing app/(app)/playground/[teamId]/page.tsx
(the old agent teams hub). Before moving, delete app/(app)/playground/[teamId]/page.tsx
and app/(app)/playground/page.tsx (the old /playground listing page) — these are replaced
by the new playground system.
Then create app/(app)/playground/[id]/page.tsx with the existing /spaces/[id] content.

Update all sidebar links from /spaces/ to /playground/.
Update all API calls and redirects (check components/Sidebar.tsx createPlayground → router.push).
Check app/api/playgrounds/ routes — no change needed there.

--- TASK 3: Update /chat page ---
The /chat page already exists. Make one change: if the user has no conversation yet, show a
welcome message: "What would you like to work on today?" with 3 quick-start suggestions based
on their existing playgrounds (fetch from /api/playgrounds, show their names as suggestion chips).

--- TASK 4: Sidebar Playgrounds section — update links ---
Already built in Sidebar.tsx but links to /spaces/[id]. Update to /playground/[id].
The create modal stays as-is — it already works.

--- TASK 5: Overview page stub ---
The current /overview page (app/(app)/overview/page.tsx) is a "How It Works" diagram.
Replace it with a simple placeholder: "Overview — your customizable dashboard. Coming in Session 10."
Keep the route alive, just replace the content so it's not confusing.

--- TASK 6: Logo redesign — unify across all surfaces ---
There are currently THREE different logo marks in the codebase. Consolidate to one.

Current state:
  components/Logo.tsx  → BrainNetwork SVG (brain outline + 3 nodes), uses --color-brand (sky blue #38BDF8)
  app/page.tsx         → inline Logo() component: a 3-line asterisk in rust (#D4715A)
  webroot/ar/index.html → inline graph-node SVG, uses dark grey tones

Target: one consistent mark everywhere — the rust asterisk from app/page.tsx.
The design system spec (HANDOFF.md, globals.css, design system docs) already specifies
rust #D4715A as the brand mark color. The BrainNetwork uses sky blue which contradicts this.

Steps:
  1. Rewrite components/Logo.tsx to export a single LogoMark component that renders
     the 3-line asterisk (same SVG as the inline Logo() in app/page.tsx):
     
     3 lines crossing at center, each rotated 60°, stroke rust #D4715A, strokeWidth 3.5,
     strokeLinecap round. viewBox 0 0 26 26.

     Export:
       LogoMark({ size, color? })   — size default 20, color default "#D4715A"
       LogoFull({ size, color? })   — same mark + "AgentPlayground" text next to it

  2. Update components/Sidebar.tsx: already imports LogoMark — no change needed after
     step 1 since it will now render correctly.

  3. Update app/page.tsx: remove the inline Logo() function, replace <Logo /> usage
     with <LogoMark size={26} /> imported from "@/components/Logo".

  4. Check app/(marketing)/layout.tsx (if it exists) — update any logo mark there too.

  5. The app favicon is already set correctly via globals — no change needed.

  6. Do NOT update webroot/ar/index.html yet — that gets its own redesign in Session 10.

--- TASK 7: Deploy ---
1. scp all changed files to VPS
2. Rebuild container (use --no-cache because we deleted directories)
3. Verify: sidebar shows Chat + Overview + Playgrounds list, nothing else
4. Verify: clicking a playground goes to /playground/[id]
5. Verify: /chat still works, coordinator still responds
6. Verify: logo mark in sidebar and on agentplayground.net matches — same rust asterisk
7. Update HANDOFF.md

Done when: the sidebar is clean, Playgrounds are the primary nav, Chat and Overview are the
only top-level destinations, and the logo mark is the same rust asterisk everywhere in the app.
```

---

## SESSION 8 — Playground Environment + Default Playgrounds
**~3-4 hrs. Each playground becomes its own contextual workspace.**

```
Read HANDOFF.md and docs/pivot/09-PLATFORM-VISION.md before starting.

Two goals: (1) the playground page becomes an environment with its own sidebar, not just a
static dashboard. (2) Default playgrounds ship with the app so fresh installs have content.

--- TASK 1: Playground environment layout ---
Create app/(app)/playground/[id]/layout.tsx.

This layout wraps only the /playground/[id] sub-routes. It renders:
- Left: a playground-specific sidebar (NOT the global sidebar — that stays on the outside)
- Right: the playground content area

The OUTER global sidebar still shows. The playground sidebar is an inner panel, like a
secondary navigation that appears when you're inside a playground. Think: VS Code's Explorer
panel when you open a project.

Playground sidebar (inner, ~200px):
  Playground name + icon at top (with edit pencil on hover)
  
  SECTION: Workspace
    Chat         → /playground/[id]/chat      (chat scoped to this playground's teams)
    Dashboard    → /playground/[id]           (the existing agent/task/skills grid)
    Brain        → /playground/[id]/brain     (scoped Brain docs for this playground)
  
  SECTION: Teams (collapsible)
    [list of teams in this playground, each links to /playground/[id]/team/[teamId]]
  
  SECTION: Apps (collapsible)  
    [empty for now — placeholder "No apps installed"]
    [+ Install App button — disabled, "Coming soon"]
  
  Bottom: Settings link → /playground/[id]/settings

Create app/(app)/playground/[id]/chat/page.tsx:
- Same chat component as /chat but with a system note: coordinator knows it is operating
  within the [playgroundName] playground context
- The team picker (if one exists in the current chat UI) is pre-filtered to only the teams
  in this playground
- If no teams in playground: show "Add teams to this playground in Settings to start chatting"

Create app/(app)/playground/[id]/brain/page.tsx:
- Show Brain documents that have a tag matching this playground's name or id
- Use GET /api/brain or GET /api/files, filter client-side by tag for now
- "Add file to this playground's Brain" button → opens Brain upload UI with the playground
  tag pre-selected
- If no tagged docs: empty state "No knowledge added to this playground yet. Upload files to
  give your agents context specific to [playgroundName]."

Create app/(app)/playground/[id]/settings/page.tsx:
- Edit name, icon, color
- Manage teams: multi-select (same as the create modal, but for an existing playground)
- Brain tags: comma-separated tags that define which Brain documents are scoped here
- Delete playground (with confirmation)
- PATCH → /api/playgrounds/[id]

--- TASK 2: Brain tag scoping ---
Add a `brainTags` field to the Playground model in prisma/schema.prisma:
  brainTags  String[]  @default([])

Run npx prisma db push locally (VPS will be done at deploy time).

Update GET /api/playgrounds/[id] to include brainTags.
Update PATCH /api/playgrounds/[id] to accept brainTags in the body.

The Brain page at /playground/[id]/brain uses these tags to filter documents.
This is a simple client-side filter for now — no new DB query needed.

--- TASK 3: Default playgrounds ---
In lib/seed-teams.ts (or create lib/seed-playgrounds.ts), add a function seedDefaultPlaygrounds().
This creates 3 default playgrounds if the user has 0 playgrounds:

Playground 1 — "Development"
  icon: "💻", brainTags: ["dev", "code", "development"]
  teams: any teams whose name contains "dev", "code", "tech", or "engineer" (case-insensitive match)
  If no matching teams: teamIds = [] (empty — user can add later)

Playground 2 — "Research"
  icon: "🔬", brainTags: ["research", "study", "notes"]
  teams: any teams whose name contains "research", "study", or "learn"

Playground 3 — "Business"
  icon: "💼", brainTags: ["business", "ops", "finance", "marketing"]
  teams: any teams whose name contains "business", "ops", "finance", "marketing", "sales"

Call seedDefaultPlaygrounds() at the end of the existing /api/setup/complete route handler,
after seeding teams. Also call it in a GET /api/playgrounds check: if the list is empty
after fetching, seed defaults and return them.

--- TASK 4: Deploy ---
1. npx prisma db push on VPS (brainTags field)
2. scp all changed files, rebuild container
3. Test: click a playground → see the inner sidebar with Chat / Dashboard / Brain / Teams / Settings
4. Test: playground Chat loads and the coordinator responds
5. Test: playground Brain shows empty state (or scoped docs if any tagged ones exist)
6. Test: fresh user with no playgrounds gets 3 default ones seeded
7. Update HANDOFF.md

Done when: each playground is an environment with its own sidebar, scoped Brain, and scoped
chat. Default playgrounds appear for new users.
```

---

## SESSION 9 — Playground Creation Assistant
**~3-4 hrs. Creating a playground becomes a conversation, not a form.**

```
Read HANDOFF.md and docs/pivot/09-PLATFORM-VISION.md before starting.

When a user clicks "+ New Playground" in the sidebar, instead of a simple form modal,
a chat panel opens. The coordinator helps them configure the playground step by step.

--- TASK 1: Creation assistant panel ---
Replace the existing create-playground modal (in components/Sidebar.tsx) with a slide-in
panel from the right side of the screen (or a full centered modal — match whatever feels
right with the current design system).

Panel layout:
  Header: "Create a Playground"
  Body: a mini chat interface (message list + input box)
  Footer: [Cancel] button

When the panel opens, the assistant sends an opening message:
  "Hi! I'll help you set up your playground. What would you like to use it for?
   For example: 'A marketing workspace with content and social media agents' or
   'A dev environment for my backend projects'."

The user types their intent. The assistant (a call to POST /api/chat with a special system
prompt — see Task 2) responds with a proposed configuration and asks for confirmation.

--- TASK 2: Playground assistant system prompt ---
Create a new internal endpoint or reuse POST /api/chat with a special system prompt.

The playground assistant prompt should tell the coordinator:
- It is helping a user configure a new Playground
- Available tools it can call: list_teams (returns existing teams), create_team (creates a new
  team), create_playground (creates the playground and closes the panel)
- It should ask clarifying questions if needed, then propose: name, icon, which existing teams
  to include, whether new teams are needed, and what Brain tags to apply
- When the user approves: call create_playground with the final config

Add 3 new chat tools to lib/chat-tools.ts (or inline in the assistant prompt handling):

  list_teams: no args → returns array of { id, name, agentCount } for all user teams

  suggest_playground_config: args: { userIntent: string } → returns a proposed config object:
    { name, icon, description, suggestedTeamIds: string[], suggestedBrainTags: string[],
      newTeamsNeeded: { name, role, description }[] }
    This is a deterministic LLM call — prompt the model to return JSON based on user intent
    and the team list.

  create_playground_from_config: args: { name, icon, teamIds, brainTags, newTeams } →
    1. Create any newTeams (POST /api/teams for each, with a default coordinator agent)
    2. POST /api/playgrounds with the final config
    3. Return { playgroundId, playgroundName }

--- TASK 3: Panel state machine ---
The panel component manages 4 states:
  "chatting"   → showing the assistant chat
  "proposing"  → assistant has proposed a config, showing a summary card + [Looks good] / [Change something] buttons
  "creating"   → spinner while create_playground_from_config runs
  "done"       → "Your playground is ready!" → [Open Playground] button

On "done": close the panel, add the new playground to the sidebar list, navigate to /playground/[id].

--- TASK 4: Import from file (keep the old flow available) ---
In the playground settings page (/playground/[id]/settings), add an "Import" section:
  "Import a Playground package"
  File picker (.zip) → POST /api/library/install (already exists from earlier plan)
  This is the manual import path for users who download playground packages from the Library.
  Keep it in settings, not in the creation flow.

--- TASK 5: Deploy ---
1. scp all changed files, rebuild
2. Test: click + in sidebar → panel opens with greeting message
3. Type: "I want a marketing playground with content and social agents"
4. Verify: assistant proposes a config with suggested teams
5. Confirm → playground is created → navigate to it
6. Update HANDOFF.md

Done when: creating a playground is a conversation, the assistant proposes a config, and on
confirm the playground appears immediately in the sidebar.
```

---

## SESSION 10 — Overview Dashboard + Pre-launch Polish
**~2-3 hrs. The overview becomes useful. Then end-to-end test before release.**

```
Read HANDOFF.md and docs/pivot/09-PLATFORM-VISION.md before starting.

Two goals: (1) build the Overview as a real widget dashboard. (2) end-to-end polish test
before the GitHub release and sharing with friends.

--- TASK 1: Overview widget dashboard ---
Replace the placeholder at app/(app)/overview/page.tsx with a real widget board.

For now: a fixed grid of widgets (no drag-to-arrange yet — keep it simple for launch).

Default widget grid (2-column CSS grid, responsive):

  Widget 1 — Active Tasks
    Fetch GET /api/tasks?status=running,pending&limit=10
    Show: task title, team name, status dot, "started X minutes ago"
    Empty state: "No active tasks"

  Widget 2 — Playgrounds Quick-Launch
    List all user playgrounds as clickable cards (icon + name)
    Each card: click → navigate to /playground/[id]
    At the bottom: "+ Create Playground" button

  Widget 3 — Recent Completions
    Fetch GET /api/tasks?status=completed&limit=5
    Show: task title, team name, "completed X ago"

  Widget 4 — Plans Status
    Fetch GET /api/plans?limit=5
    Show: plan title, status badge (draft/running/completed/failed), created date

  Widget 5 — Brain Summary
    Fetch GET /api/brain?limit=1 (or count endpoint)
    Show: document count, last indexed date
    Link: "Open Brain →" → /files

  Widget 6 — Quick Chat
    A single-line input: "Ask anything..."
    On submit: navigate to /chat with the message pre-filled as a query param
    This is NOT a full chat — just a launcher

Header: "Overview" + subtitle "Your agents at a glance"
Note: No drag-and-drop for now. Layout customization is a Phase 3 feature.

--- TASK 2: Actions + Plans in playground context ---
The /actions and /plans pages still exist but are not in the sidebar.
Add them to the playground inner sidebar under SECTION: Workspace:
  Chat         → /playground/[id]/chat
  Dashboard    → /playground/[id]
  Plans        → /plans (global for now — scoping to playground is Phase 3)
  Actions      → /actions (global for now)
  Brain        → /playground/[id]/brain

This makes Plans and Actions discoverable without cluttering the main nav.

--- TASK 3: Settings — provider and model selector ---
The Settings page (/settings) currently has API Keys. Add two more fields:
  Default Provider: radio buttons — OpenAI | Anthropic | Ollama
    Saved to AgentMemory key "DEFAULT_PROVIDER"
  Default Model: dropdown per provider
    OpenAI: gpt-4o-mini (recommended) | gpt-4o
    Anthropic: claude-haiku-4-5-20251001 | claude-sonnet-4-6 | claude-opus-4-8
    Ollama: text input (model name)
    Saved to AgentMemory key "DEFAULT_MODEL"
  Read DEFAULT_PROVIDER and DEFAULT_MODEL in app/api/chat/route.ts when selecting the model.

--- TASK 4: ar.agentplayground.net — full rebuild as lead gen + chatbot ---
The current ar site sells plans with fixed prices and a MercadoPago button. Delete all of
that. Replace it with a clean consultation page: no prices listed, no payment flow, no plans.
The purpose is: visitor arrives → chatbot qualifies what they need → they book a call or
request contact. Revenue comes from the follow-up conversation, not the page.

WHAT THE PAGE IS:
  A service page for custom private VPS installations with custom AgentPlayground setups
  and monthly maintenance. Argentine market, Spanish copy.
  The offer: "We build a private AI platform tailored to your business."
  Lead capture: chatbot + meeting request + contact email.

--- 4A: Completely rewrite webroot/ar/index.html ---

Delete: plans grid, plan cards, MercadoPago buttons, plan prices, trust bar,
        services-grid, addons-grid, stack-grid, process-cols, the pagar() JS function,
        all existing CSS classes tied to those sections.
Keep:   nav structure, FAQ (rewritten), footer, the general HTML/CSS skeleton.

New page structure:

NAV (keep sticky nav with logo, links):
  Logo: rust asterisk SVG (same as main site — see Session 7 Task 6 for the exact SVG)
  Brand: "AgentPlayground AR"
  Links: [¿Qué hacemos?] [Cómo funciona] [FAQ] [Contacto]
  CTA button: [Hablar con un asesor →] → scrolls to chatbot section

HERO:
  Badge: "Servicio personalizado · Sin planes fijos · Cotización a medida"
  H1: "Tu plataforma de IA privada,\nconstruida para tu negocio."
  Subtext: "Instalamos AgentPlayground en tu propio servidor, configuramos equipos de
            agentes a medida para tus flujos de trabajo, y lo mantenemos funcionando.
            Sin dependencias de terceros. Sin suscripciones. Solo tuyo."
  CTAs: [Descubrí qué necesitás →] (scrolls to chatbot) · [Descargar la app gratis ↗] (→ agentplayground.net/download)

QUÉ HACEMOS section (3 cards, clean grid):
  🖥️  Instalación en VPS
      "Configuramos tu servidor, Docker, HTTPS automático, base de datos y todos los
       servicios necesarios. Listo para usar en 24–48hs."

  🤖  Playgrounds a medida
      "Construimos los espacios de trabajo de IA específicos para tus necesidades:
       equipos de agentes, base de conocimiento, herramientas integradas."

  🔧  Mantenimiento mensual
      "Actualizaciones, backups, monitoreo y soporte técnico continuo. Vos usás,
       nosotros nos ocupamos de que funcione."

CÓMO FUNCIONA section (4 numbered steps, clean vertical list):
  1. Charlamos — Contanos qué necesitás. El asesor (o el chat) te hace preguntas
     para entender tu negocio y lo que querés automatizar.
  2. Te cotizamos — Te mandamos una propuesta personalizada con alcance, precio y plazo.
     Sin compromiso.
  3. Construimos — Instalamos, configuramos y entregamos tu plataforma funcionando.
  4. Te acompañamos — Soporte post-entrega y mantenimiento mensual opcional.

CHATBOT section (the main CTA):
  Heading: "Contanos qué necesitás"
  Subtext: "Respondé algunas preguntas y el asesor virtual te da una idea del alcance
            y costo aproximado de tu proyecto."
  Below: the chatbot widget (see 4B)

CONTACT / BOOKING section:
  "¿Preferís hablar directamente?"
  [Agendar una reunión →] → mailto:hello@agentplayground.net?subject=Reunión AgentPlayground AR
  (Until Calendly or similar is set up, a mailto with subject pre-filled is fine)
  Secondary: hello@agentplayground.net

FAQ (rewritten, 5 questions):
  ¿Cuánto cuesta? → "Depende del alcance. Después de la charla inicial te mandamos una
    propuesta personalizada. El chat de abajo puede darte una idea preliminar."
  ¿Necesito saber programar? → No. Todo se maneja desde el dashboard web.
  ¿Qué es un VPS? → Explicación simple. Recomendamos Hetzner (~$6 USD/mes).
  ¿Incluyen las claves de API? → No. Son tuyas. Ollama corre modelos gratis localmente.
  ¿Qué pasa si no me gusta? → Hablamos antes de cobrar. Presupuesto sin compromiso.

FOOTER:
  Logo (rust asterisk) · AgentPlayground AR
  Links: [agentplayground.net] [Descargar app →] [hello@agentplayground.net]
  Copy: "Servicio gestionado · Argentina · © 2026"

DESIGN: same color system as the current ar site (dark bg #080809) but accent switches
from blue #009EE3 to rust #D4715A throughout. Keep it clean — no decorative elements.

--- 4B: Chatbot widget (embedded JS in the same HTML file) ---

A floating or inline chat panel in the "Contanos qué necesitás" section.
NOT a full-page chat — a compact widget (~460px wide, message list + input).

The chatbot calls a new public API endpoint (see 4C). It does NOT use the main /api/chat
route (that requires auth). It uses a dedicated public endpoint.

Chat widget behavior:
  - Opens with a greeting from the bot (no user action needed, message appears on load)
  - Each message from the bot appears with a short typing delay (300ms)
  - User types and hits Enter or clicks Send
  - Messages display in a simple bubble layout (bot left, user right)
  - At end of conversation: show a "Solicitar contacto" button that opens a mailto

Opening bot message:
  "¡Hola! Soy el asesor virtual de AgentPlayground. Te voy a hacer algunas preguntas
   para entender qué necesitás y darte una idea del costo. ¿Empezamos?"

The bot asks these questions in sequence (one at a time, waiting for user reply):
  1. ¿En qué rubro o industria trabajás?
  2. ¿Cuántas personas usarían la plataforma?
  3. ¿Qué tareas te gustaría automatizar o delegar a los agentes de IA?
  4. ¿Tenés servidor propio o necesitás que lo consigamos nosotros?
  5. ¿Tenés algún plazo o urgencia en mente?

After question 5: the API returns a summary + rough price range + recommendation.
Then the bot says something like:
  "Basado en lo que me contaste, el alcance estimado sería: [summary]. El costo
   aproximado para un proyecto como este está en el rango de [X–Y USD]. ¿Querés
   que te mandemos una propuesta detallada sin compromiso?"
  Buttons: [Sí, quiero una propuesta] → opens mailto  /  [Tengo más preguntas] → continues chat

--- 4C: New public API endpoint for AR chatbot ---
Create app/api/public/ar-chat/route.ts:
  POST — no auth required
  Body: { messages: { role: "user"|"assistant", content: string }[] }
  
  System prompt (hardcoded in this route):
    You are a sales assistant for AgentPlayground AR, a service that builds private AI
    platforms for businesses. You speak Spanish (Argentine informal — use "vos").
    
    Your goal: ask the 5 qualification questions one at a time, understand the client's
    needs, then provide a friendly price estimate and recommendation.
    
    Pricing reference (do not show this as a menu — fold it into a natural summary):
      VPS setup + full installation: $150–300 USD one-time (depends on complexity)
      Custom playground build: $200–600 USD per playground (depends on agent count and
        custom tools needed)
      Monthly maintenance: $99–250 USD/month (depends on scope)
      Typical first project (install + 2 playgrounds + 1 month maintenance): $600–1200 USD
    
    After question 5, give a 2-3 sentence summary of what you understood, a realistic
    price range, and encourage them to request a detailed proposal.
    
    Keep messages short (2-4 sentences max). One question at a time. Friendly, not salesy.
    Do not mention specific vendor names or make binding commitments.
  
  Use the existing provider logic (read ANTHROPIC_API_KEY or OPENAI_API_KEY from env or
  AgentMemory). Use the cheapest available model (gpt-4o-mini or claude-haiku).
  Stream: false (simple JSON response for the static HTML to consume).
  Return: { message: string }

Rate limit this endpoint: max 20 requests per IP per hour (use a simple in-memory Map
with timestamps — no Redis needed, restarts reset it, that's fine for now).

--- 4D: SCP and verify ---
SCP the updated file to VPS:
  scp -i ~/.ssh/id_ed25519 webroot/ar/index.html root@95.217.163.247:/root/opt/vps/webroot/ar/index.html

SCP the new API route (after container rebuild):
  The app/api/public/ar-chat/route.ts goes through the normal Next.js build.

Rebuild the dashboard container (new API route requires rebuild):
  ssh ... "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"

Verify:
  1. ar.agentplayground.net loads with NO prices, NO plan cards, NO payment buttons
  2. Chatbot sends a greeting on load
  3. Type a response → bot replies with the next question
  4. Complete all 5 questions → bot gives a price range summary
  5. "Solicitar contacto" button works (opens mailto)
  6. POST https://app.agentplayground.net/api/public/ar-chat → returns { message: "..." }

--- TASK 5: End-to-end pre-launch test ---
Simulate what a friend will do:
1. Fresh Docker install (remove volumes, cd docker/, copy .env.example → .env.local, add OpenAI key)
2. Run start.bat or ./start.sh → wizard appears
3. Complete wizard: pick OpenAI, create account, pick Personal starter
4. Verify: 3 default playgrounds appear in the sidebar
5. Click a playground → inner sidebar appears, Chat and Dashboard work
6. Open Chat (global) → send a message → coordinator responds
7. Open Overview → all widgets load (some empty states expected — that's OK)
8. Click + New Playground → assistant panel opens, complete the creation flow
9. Note every friction point, error, or confusing moment

Fix the top 3 most impactful issues found.

--- TASK 7: Deploy + GitHub release ---
1. scp all remaining app changes
2. Rebuild container on VPS
3. Verify app.agentplayground.net, agentplayground.net, and ar.agentplayground.net all work
4. Verify: all three surfaces use the rust asterisk logo
5. Now do the Phase 1 release checklist:
   □ docker build -t agentplayground/app:0.1.0 .
   □ docker push agentplayground/app:0.1.0
   □ docker tag agentplayground/app:0.1.0 agentplayground/app:latest
   □ docker push agentplayground/app:latest
   □ bash docker/build-release.sh → agentplayground-v0.1.0.zip
   □ Create GitHub repo "agentplayground" → push code → create Release v0.1.0 → upload ZIP
   □ Update downloadUrl in /api/version → redeploy
6. Send agentplayground.net/download to first friend

Update HANDOFF.md. Mark Phase 2 complete.

Done when: app is clean, overview works, ar site is on-brand, GitHub release link is live.
```

---

## PHASE 3 — Subapp Platform + Open SDK (Sessions 11–15)
Goal: playgrounds become extensible mini-apps. Third parties can build and publish compatible apps.
Start this phase AFTER friends have tested and given feedback on Phase 2.

```
Sessions 11–15 are not fully specced yet. Write the prompts for each at the start of that session
based on what feedback from friends reveals and what the platform needs next.

Planned work (rough order):
  Session 11 — Subapp model: install mini-tools into a playground (social stats, server monitor, etc.)
               The Apps section of the playground inner sidebar becomes functional.
               First subapp: a simple social media stats viewer (embeds a URL or renders a widget).
  Session 12 — Subapp package format: define the JSON/ZIP format for a subapp package.
               Subapps have: manifest.json (name, description, entryPoint), a React component or
               an iframe URL, and optionally a backend route handler.
               Import from file: /playground/[id]/settings → Install App → upload .zip
  Session 13 — Open platform SDK docs: write developer docs at agentplayground.net/docs.
               A developer using Claude Code should be able to read the docs and build a
               compatible subapp. Docs cover: playground.json format, subapp manifest,
               how Brain tags work, how to call the coordinator from a subapp.
  Session 14 — Library updates: playgrounds in the library can include subapps.
               The library install flow installs the subapp alongside the playground.
               library.agentplayground.net shows the subapps included with each playground.
  Session 15 — B2B playground provisioning: the /admin panel gets a "Provision Client" flow.
               Fill in: client name, template, hosting type → generates subdomain config,
               seeds the playground, creates a client admin account. This is the delivery
               workflow from docs/pivot/08-PLAYGROUND-PRODUCT.md.
```

---

## NOTES

**Starting each session:** Read HANDOFF.md first, then paste the session prompt. Let Claude finish
the full session before reviewing.

**If a session runs long:** Stop at a working state (the "done when" condition). Note in HANDOFF.md
what's left. Start the next session describing what remains.

**Deploying:** Always scp files, never git pull on VPS. After deleting directories: --no-cache rebuild.

**Platform vision:** See docs/pivot/09-PLATFORM-VISION.md for the full vision doc. Read it at
the start of any Phase 2 or 3 session.

**OpenAI for friends:** They need a key from platform.openai.com/api-keys (separate from ChatGPT
subscription). $10 in credits is months of casual use. GPT-4o mini is the default — cheap and capable.

**Ollama:** Not started by default.
Run: `docker compose -f docker-compose.yml -f docker-compose.ollama.yml up -d`
