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

## PHASE 2 — Friends feedback + Library foundations (Sessions 7–10)
Goal: collect real feedback, build workspace tabs, start the Library infrastructure.

---

## SESSION 7 — Multi-Workspace Tabs
**~3-4 hrs. Power feature — multiple parallel agent sessions in tabs.**

```
Read HANDOFF.md and docs/pivot/02-BASE-APP.md (Multi-Workspace Tabs section) before starting.

Build multi-workspace parallel sessions — a tab bar at the top of chat so the user can run multiple independent conversations simultaneously.

--- TASK 1: Workspace model ---
Add to prisma/schema.prisma:
  model Workspace {
    id           String    @id @default(cuid())
    name         String    @default("New workspace")
    userId       String
    user         User      @relation(fields: [userId], references: [id])
    status       String    @default("idle")  // idle | running | waiting
    activeTeamId String?
    createdAt    DateTime  @default(now())
    updatedAt    DateTime  @updatedAt
  }

Add workspaceId String? to the Message model.
Run npx prisma generate.

--- TASK 2: Workspace API ---
Create app/api/workspaces/route.ts:
  GET — list all workspaces for current user, ordered by updatedAt desc
  POST — body: { name? } → create workspace

Create app/api/workspaces/[id]/route.ts:
  PATCH — update name or status
  DELETE — delete workspace and its messages

Auto-create: when a user logs in with 0 workspaces, create one called "Main" silently.

--- TASK 3: Tab bar component ---
Create components/WorkspaceTabs.tsx:
- Horizontal tab bar at the top of the chat area (above the message list)
- Each tab: workspace name + status dot
  idle: no dot
  running: green pulsing dot
  waiting: amber dot
- Active tab: rust accent underline or background tint
- + button on the right: creates a new workspace
- Double-click tab name: inline rename (PATCH to update)
- Hover shows × button: delete workspace (only if more than 1 exists)
- Unread dot: blue dot on tab if it received a message while not active (clear on switch)

--- TASK 4: Wire chat to workspaces ---
- Store active workspaceId in React context or Zustand (already exists or create a simple one)
- Pass workspaceId in POST /api/chat body
- In chat route: save messages with workspaceId
- In messages fetch: filter by workspaceId
- On tab switch: reload message history for that workspace
- Persist last active workspaceId in localStorage

--- TASK 5: SSE workspace status ---
In GET /api/notify/stream (existing SSE endpoint), add event type workspace_status:
  { type: "workspace_status", workspaceId: string, status: "idle"|"running"|"waiting" }

In lib/agents/runner.ts and lib/agents/delegated.ts:
- Accept optional workspaceId
- When task starts: emit workspace_status running + UPDATE workspace.status in DB
- When task completes or fails: emit workspace_status idle + UPDATE workspace.status
- When request_human_input fires: emit workspace_status waiting

Chat client: subscribe to workspace_status events and update the tab dot.

--- TASK 6: Deploy ---
1. npx prisma db push on VPS
2. scp files, rebuild container
3. Test: create 2 workspaces, send messages in each, verify tabs switch correctly with separate histories
4. Test: start a plan → verify tab shows running dot

Update HANDOFF.md.

Done when: tab bar renders with status dots, switching tabs shows separate message histories, agent tasks update the tab status live.
```

---

## SESSION 8 — Settings Improvements + Feedback Fixes
**~2-3 hrs. Polish based on what your friends actually found confusing or broken.**

```
Read HANDOFF.md before starting.

This session applies fixes and improvements based on friend feedback. Before starting, list all issues reported or observed. Then work through them in priority order.

If no specific feedback exists yet, work through this default list:

--- DEFAULT TASK LIST ---

1. Provider selector in Settings
   The API Keys settings page (from Session 1) should also show which provider is currently being used for chat, and let the user switch default: OpenAI | Anthropic | Ollama.
   Save: AgentMemory key "DEFAULT_PROVIDER" = "openai" | "anthropic" | "ollama"
   Read this in the chat route when initializing the AI client.

2. Model selector
   In Settings → API Keys (or a new Settings → Models section):
   - OpenAI: dropdown — gpt-4o-mini (recommended, cheap) | gpt-4o | o3-mini
   - Anthropic: dropdown — claude-haiku-4-5-20251001 (fast/cheap) | claude-sonnet-4-6 | claude-opus-4-8
   Save: AgentMemory key "DEFAULT_MODEL" = model id string
   Use this in the chat route as the default model.

3. Better error messages in chat
   If the AI call fails: parse the error and show a human-readable message in the chat:
   - Invalid API key → "Your API key is invalid. Go to Settings → API Keys."
   - Rate limit → "You've hit the rate limit for your API key. Try again in a moment."
   - No key set → "No API key is configured. Go to Settings → API Keys to add one."
   These replace any raw error JSON that might show up.

4. Playground empty state
   If a Playground has no teams yet: show an inline prompt "Add your first team to this Playground" with a button to open the team selector.

5. Mobile/tablet basic responsiveness
   The sidebar on small screens should collapse to a hamburger menu. Use a simple CSS media query approach — don't add any new libraries.

6. Any other issues from the feedback list

--- TASK: Apply friend feedback ---
If there are specific bugs or feedback items noted in HANDOFF.md or shared in this session, address those first before the default list above.

Deploy all fixes to VPS. Update HANDOFF.md with what was fixed.

Done when: the biggest friction points from friend use are resolved.
```

---

## SESSION 9 — First Library Playground (Personal Life Starter)
**~3-4 hrs. Your first real Library item — a free downloadable Playground.**

```
Read HANDOFF.md and docs/pivot/06-PLAYGROUND-PLATFORM.md before starting.

Build the first Library Playground: "Personal Life Starter" — a free downloadable Playground that creates a Personal Life Playground with 4 pre-configured agents (Trainer, Nutritionist, Finance Advisor, Schedule Manager).

--- TASK 1: Playground install API ---
Create app/api/library/install/route.ts:
  POST — body: multipart/form-data with file: <playground.zip> and optional licenseKey: string
  
  What it does:
  1. Read and parse playground.json from the ZIP root
  2. For each team in teams/: create the team in DB (if a team with the same name doesn't exist)
  3. For each agent in each team: create the agent linked to the team
  4. For each skill in skills/: create the skill in DB (upsert by name)
  5. For each brain seed in brain-seeds/: upsert as a Brain document
  6. Create the Playground in DB (name, icon, color, teamIds = the created teams)
  7. Record in InstalledPlayground table: { playgroundId, version, installedAt }
  8. Return: { success: true, playgroundId, playgroundName }

Add to schema.prisma:
  model InstalledPlayground {
    id           String   @id @default(cuid())
    playgroundId String   @unique
    version      String
    installedAt  DateTime @default(now())
  }

--- TASK 2: Build the Personal Life Starter package ---
Create a folder packages/personal-life-starter/ in the repo with this structure:

packages/personal-life-starter/
  playground.json
  teams/
    personal-life.json
  skills/
    fitness-coaching.json
    nutrition-planning.json
    budget-tracking.json
    scheduling.json
  brain-seeds/
    health-fundamentals.md
    personal-finance-basics.md
  README.md

playground.json:
{
  "id": "personal-life-starter",
  "name": "Personal Life",
  "version": "1.0.0",
  "description": "A Playground for personal wellness, nutrition, finances, and scheduling",
  "icon": "🏃",
  "color": "#4A90E2",
  "free": true,
  "category": "personal",
  "teams": ["personal-life"],
  "skills": ["fitness-coaching", "nutrition-planning", "budget-tracking", "scheduling"],
  "brainSeeds": ["health-fundamentals", "personal-finance-basics"]
}

teams/personal-life.json — define 4 agents:
- Personal Trainer: helps with workout planning, fitness goals, exercise form
- Nutritionist: meal planning, dietary advice, calorie tracking, grocery lists
- Finance Advisor: budget tracking, spending analysis, savings goals, financial advice
- Schedule Manager: calendar planning, task prioritization, time management, reminders

Each agent should have a detailed system prompt (2-3 paragraphs) appropriate for their role.

skills/: create simple skill definition files (name, description, what the agent can do with it)

brain-seeds/: write 2 short markdown files (200-300 words each) with useful reference content the agents can draw on.

--- TASK 3: Package the ZIP and test install ---
Create a script scripts/package-playground.sh:
  Takes a folder name: bash scripts/package-playground.sh personal-life-starter
  Zips the folder to packages/personal-life-starter-v1.0.0.zip

Test the install API:
  curl -X POST http://localhost:3000/api/library/install \
    -F "file=@packages/personal-life-starter-v1.0.0.zip"
  
  Verify: a "Personal Life" Playground appears in the app with the 4 agents, the skills are created, brain seeds are indexed.

--- TASK 4: In-app install button ---
In the Playground section of the sidebar or in a "Library" page stub:
- Add a minimal "Install from file" button: opens a file picker, accepts .zip, POSTs to /api/library/install
- On success: navigate to the newly installed Playground
- This is how users manually install downloaded Playgrounds for now (before the Library website)

--- TASK 5: Deploy and test on VPS ---
1. npx prisma db push on VPS
2. scp files, rebuild
3. Test the install flow on the live VPS
4. Update HANDOFF.md

Done when: you can zip up the Personal Life Starter, install it via the in-app button, and see the Personal Life Playground with 4 agents appear.
```

---

## SESSION 10 — Library Website Stub + Business Ops Starter
**~3-4 hrs. The Library subdomain goes live with your first two Playgrounds.**

```
Read HANDOFF.md and docs/pivot/04-WEBSITE.md before starting.

Two things this session: the Library website stub + the Business Operations Playground.

--- TASK 1: Library route group ---
Create app/(library)/layout.tsx:
- Route for: library.agentplayground.net
- Add Traefik label to docker-compose.prod.yml for library.agentplayground.net → dashboard container
- Public, no auth
- Simple header: "AgentPlayground Library" + "Browse Playgrounds to install into your AgentPlayground"
- No footer needed yet

--- TASK 2: Library browse page ---
Create app/(library)/page.tsx:

A grid of Playground cards. For now: hardcode the 2 Playgrounds you've built.

Header: "AgentPlayground Library"
Subtext: "Download pre-built Playgrounds and install them in your AgentPlayground."

Card format:
  [Icon]  Name
  Category badge   Price badge (Free / $49 / etc.)
  1-line description
  Agent count
  [Download] button → downloads the ZIP directly

For now: 2 cards
  1. Personal Life Starter — Free — "Trainer, nutritionist, finance advisor, schedule manager"
  2. Business Ops Starter — Free — (built in Task 3)

Serve the ZIP files from public/library/ (put the built ZIPs there).

--- TASK 3: Build Business Ops Starter ---
Following the same pattern as the Personal Life Starter (Session 9), build:

packages/business-ops-starter/
  playground.json  — id: "business-ops-starter", name: "Business Operations", icon: "💼"
  teams/
    operations-team.json  — 3 agents: Process Analyst, Doc Manager, Report Writer
  skills/...
  brain-seeds/...
  README.md

Package it: packages/business-ops-starter-v1.0.0.zip

--- TASK 4: Individual Playground page ---
Create app/(library)/playground/[id]/page.tsx:
For now: use a static list of the 2 Playgrounds — no DB for the Library yet.

Show:
- Name, icon, description
- Agent list (names + roles)
- Skills list
- What's in the Brain seeds (bullet list from README.md)
- [Download] button linking directly to the ZIP in public/library/

--- TASK 5: Resources page stub ---
Create app/(marketing)/resources/page.tsx (on the main agentplayground.net site):
- H1: "Build on AgentPlayground"
- Placeholder text: "Documentation for building your own Playgrounds coming soon."
- Link to the Library: "Browse existing Playgrounds →"
- This page will be filled in later. For now it just needs to exist and not 404.

--- TASK 6: Update download page ---
On agentplayground.net/download, add a section at the bottom:
"Once installed, browse the Library to add pre-built Playgrounds →"
Link: library.agentplayground.net

--- TASK 7: Deploy ---
1. scp files + new ZIPs in public/library/
2. Add Traefik label for library.agentplayground.net
3. Rebuild container
4. Verify: library.agentplayground.net loads with 2 Playground cards
5. Verify: downloading a ZIP from the library and installing via in-app button works end-to-end
6. Update HANDOFF.md

Mark Phase 2 as in progress. Note what's ready to share (download link + library link).

Done when: library.agentplayground.net shows 2 downloadable Playgrounds, both install correctly.
```

---

## NOTES

**Starting each session:** Read HANDOFF.md first, then paste the prompt. Let Claude finish the full session before reviewing.

**If a session runs long:** Stop at a working state (a "done when" condition). Note in HANDOFF.md what's left. Start the next session describing what remains — you do not need to re-paste the full prompt.

**Deploying:** Always scp files, never git pull on VPS. After deleting directories: use --no-cache rebuild.

**OpenAI for friends:** They need a key from platform.openai.com/api-keys (separate from ChatGPT subscription). $10 in credits is months of casual use. Suggest GPT-4o mini as the default — it's the cheapest option and still very capable.

**Ollama:** Not started by default. Friends who want local AI run: `docker compose -f docker-compose.yml -f docker-compose.ollama.yml up -d`
