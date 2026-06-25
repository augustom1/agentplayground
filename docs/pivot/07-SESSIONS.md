# Session Roadmap

> Updated: 2026-06-25  
> Revised scope: VPS app IS the desktop app. Same codebase, packaged for Docker download.  
> Playground = organizational dashboard (simple). Library = separate subdomain (Phase 3).

---

## Phases

1. **Phase 1 (Sessions 0-4):** Make the app work as a downloadable local app + add Playground dashboard
2. **Phase 2 (Sessions 5-6):** Download page + public release
3. **Phase 3 (future):** Library website + Connected App loader + first paid listings
4. **Phase 4 (future):** B2B Playground builds + white-label hosting

---

## Phase 1: Desktop App Foundation

### Session 0 — Sensorguard Cleanup (30 min)
Pre-req. Closes out the demo branch, cleans VPS.  
Prompt: `PROMPT-SCHEDULE.md` → Session 0

### Session 1 — Nav Cleanup + Hub Endpoints (2-3 hrs)
- Hide /cv, /learn, /notes, /connect from non-admin users in sidebar
- Add `License` model to schema
- Add `/api/version` public endpoint
- Add `/api/app/connect` (desktop app auth via license key)
- Add `/admin/licenses` CRUD page
- Deploy to VPS + verify

### Session 2 — First-Run Wizard (2-3 hrs)
- Detect empty DB → redirect to `/setup`
- 5-step wizard: welcome → connection mode → API keys → create account → starter template
- Store config in `AgentMemory`
- Works for fresh Docker install (no pre-existing data)

### Session 3a — Playground Dashboard (2-3 hrs)
A Playground is an organizational container for agent teams. The dashboard is the same template for every Playground — no custom UI per Playground, just a standard view.

- `Playground` model in schema: id, name, icon, color, teamIds[], userId, createdAt
- CRUD API routes: `app/api/playgrounds/` (list, create, update, delete)
- Playground sidebar section in nav (below existing items)
- Clicking a Playground → dashboard view: agent cards, active tasks, projects, skills summary
- "+ New Playground" creates one, you pick teams to include
- No Connected App logic yet — that's Phase 3

### Session 3b — Multi-Workspace Tabs (2-3 hrs)
- `Workspace` model in schema
- Workspace API routes (CRUD)
- Tab bar component at top (switching only, no live status yet)
- Chat messages scoped to `workspaceId`
- SSE pushes workspace status (idle / running / waiting)

### Session 4 — Docker Packaging (2-3 hrs)
- `docker/docker-compose.yml` for standalone local mode
- `docker/start.bat` + `docker/start.sh` + `docker/stop.bat` + `docker/stop.sh`
- `.env.example` template
- `entrypoint.sh` auto-runs `prisma db push` + seeds DB if empty
- `INSTALL.md` user-facing install guide
- Build + test full fresh-install flow locally

---

## Phase 2: Public Release

### Session 5 — Download Page + Website (2-3 hrs)
- Add `(marketing)` route group to VPS app
- Traefik config: `agentplayground.net` → dashboard container
- Homepage (`/`) + download page (`/download`) + `/resources` stub
- `llms.txt`, `robots.txt`, `sitemap.xml`
- JSON-LD structured data on homepage
- Deploy + verify

### Session 6 — Polish + GitHub Release (1-2 hrs)
- End-to-end test: fresh Docker install → wizard → create team → create Playground → run a plan
- Fix any issues
- Update `README.md` with install instructions + screenshots
- Create GitHub Release v0.1.0, attach ZIP
- Update `/api/version` endpoint to return `"0.1.0"` + download URL

---

## Phase 3: Library + Connected Apps (future — start after traction)

Do not start until:
- App is publicly downloadable and working
- At least 50 downloads or some organic interest
- You have one Connected App you want to build and sell

### Session L1 — Library Subdomain + Install API (3-4 hrs)
- `app/(library)/` route group — browse page, individual listing page
- Traefik router: `library.agentplayground.net` → dashboard container
- `POST /api/library/install` — accepts Playground ZIP: extracts agent configs, creates Playground + teams
- License key validation for paid listings
- Deeplink: `agentplayground://install?id=...` opens app and triggers install

### Session L2 — Connected App Loader (2-3 hrs)
- `ConnectedApp` model added to schema (linked to `Playground`)
- Install API extended: if ZIP contains `app.json`, creates `ConnectedApp` record
- Bundled app: extracts static files to `public/apps/[id]/`
- "Open App" button on Playground dashboard (only shown if `ConnectedApp` exists)
- Playground panel loads the app in full-width: `<iframe src="/apps/[id]/index.html?token=...">` or external URL
- `/api/app/*` routes (Connected App API): me, chat, brain/search, brain/add, tasks, events

### Session L3 — First Paid Listing (3-4 hrs)
- Build first Connected App (pick whichever vertical has the most obvious value)
- Package as Playground ZIP with `app.json`
- Listing page on library.agentplayground.net with screenshots
- Stripe checkout → license key email → deeplink install → license validated

### Session L4 — Resources Page + Creator Submission (2-3 hrs)
- `/resources` on main site: API reference, manifest format, getting started guide
- `/submit` on library: creator submission form (manual review for now)
- `/account` on library: creator dashboard (install counts, payouts stub)

Reference `06-PLAYGROUND-PLATFORM.md` and `05-BUSINESS-MODEL.md` for full spec.

---

## Phase 4: B2B Builds (future — after Phase 3)

See `08-PLAYGROUND-PRODUCT.md`. Adds:
- Dedicated Playground interface for non-technical business users (replaces coordinator for their employees)
- White-label: client logo, color, domain
- Multi-user Playground with employee roles
- Provisioning flow for new B2B clients (shared or dedicated VPS)

---

## Dropped for Now

| Dropped | Why |
|---|---|
| Separate `agent-playground-desktop/` repo | Unnecessary complexity before monetizing |
| Stripped base app (no personal pages) | Personal pages already gated to admin |
| Stripe payment automation | Manual for first clients |
| Electron wrapper | Docker ZIP ships first |
| Multi-VPS client isolation | Buy second VPS when there are paying clients |

---

## Prompt Schedule

See `PROMPT-SCHEDULE.md` for exact prompts to paste each session.
