# Installer + Distribution Strategy

> Session: Pivot-C  
> Goal: User downloads a ZIP, double-clicks a script, app opens in browser at localhost:3000

---

## V1: Docker Package (ship this)

The fastest, most reliable path. User needs Docker Desktop installed — that's the only prerequisite.

### What They Download

A ZIP from agentplayground.net:
```
agentplayground-v0.1.0-windows.zip  (or -mac, -linux)
  agentplayground/
    docker-compose.yml
    .env.example
    start.bat           ← Windows: double-click to start
    start.sh            ← Mac/Linux: run in terminal
    stop.bat / stop.sh
    INSTALL.md
```

The `docker-compose.yml` pulls pre-built images from Docker Hub:
```yaml
services:
  app:
    image: agentplayground/app:0.1.0
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://ap:ap@postgres:5432/agentplayground
      ...
  postgres:
    image: postgres:16-alpine
  redis:
    image: redis:7-alpine
  ollama:
    image: ollama/ollama
    volumes: ["ollama_data:/root/.ollama"]
```

### The Start Script (Windows)
```batch
@echo off
echo Starting AgentPlayground...
docker compose up -d
timeout /t 5
start http://localhost:3000
echo Done! AgentPlayground is running at http://localhost:3000
pause
```

### The Start Script (Mac/Linux)
```bash
#!/bin/bash
echo "Starting AgentPlayground..."
docker compose up -d
sleep 5
open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000
echo "AgentPlayground running at http://localhost:3000"
```

### Building + Publishing the Docker Image

From the `agent-playground-desktop/` repo:
```bash
# Build
docker build -t agentplayground/app:0.1.0 .

# Push to Docker Hub
docker push agentplayground/app:0.1.0

# Also tag as latest
docker tag agentplayground/app:0.1.0 agentplayground/app:latest
docker push agentplayground/app:latest
```

GitHub Actions workflow runs this on every version tag push.

---

## V2: Electron Wrapper (next step after V1 ships)

An Electron app that:
1. Checks if Docker Desktop is running; if not, shows an error with a link to download it
2. Starts `docker compose up` programmatically
3. Opens the app in a Chromium window (not the system browser)
4. Shows a tray icon with "AgentPlayground: Running"
5. "Check for updates" button → polls `/api/version` → prompts to download new ZIP

This gives the "proper native app" feel without complexity.

**Tech stack for wrapper:**
- Electron 32+
- `electron-builder` for packaging .dmg/.exe/.AppImage
- Shell out to `docker compose` via Node `child_process`

**Window config:**
```javascript
const win = new BrowserWindow({
  width: 1440, height: 900,
  titleBarStyle: 'hiddenInset',  // Mac: traffic lights visible
  webPreferences: { nodeIntegration: false }
})
win.loadURL('http://localhost:3000')
```

Result: looks like a native desktop app, works across Mac/Windows/Linux.

---

## V3: Tauri (long-term, if Electron feels too heavy)

Tauri wraps a Rust binary + system WebView instead of bundling Chromium. Much smaller download (~10MB vs ~200MB Electron). Same functionality. Migration from Electron → Tauri is a 1-session refactor once we're there.

**Decision point:** Ship V1 first. Evaluate V2 vs V3 based on user feedback.

---

## Auto-Update Flow

1. Desktop app polls `https://app.agentplayground.net/api/version` on startup
2. Response: `{ version: "0.2.0", downloadUrl: "...", breaking: false }`
3. If newer version available:
   - Non-breaking: show banner "Update available → Download v0.2.0"
   - Breaking (DB schema change): "Update required — current data will be migrated"
4. User clicks → downloads new ZIP → replaces docker-compose.yml → `docker compose pull` → restart

For Electron V2: one-click update via `electron-updater`.

---

## What Users Must Have Installed

| V1 (Docker ZIP) | V2 (Electron) |
|---|---|
| Docker Desktop | Docker Desktop |
| A browser | Nothing extra |
| (optional) Ollama for native GPU | Same |

The install instructions page on the website should link directly to Docker Desktop download with a clear "Install this first" step.

---

## First-Time Run: Database Init

On first startup, the app container runs `npx prisma db push` automatically via `entrypoint.sh`:
```bash
#!/bin/sh
npx prisma generate
npx prisma db push
exec node server.js
```

This creates the schema silently. If it's already there, it's a no-op. No user interaction needed.

---

## Delivering Updates to Existing Clients (VPS-Hosted Plan)

When a client is on the VPS-hosted plan:
1. We SSH into their VPS
2. `docker compose pull` → pulls new image
3. `docker compose up -d --build` → restarts with new version
4. If schema changed: `docker compose exec app npx prisma db push`

This can be done by agents via the VPS tool installer or manually. Document this as a runbook in the Admin panel.

For clients who downloaded the base app and want an addon:
1. They get a new ZIP (the addon ZIP contains extra agent config JSON)
2. They run `./install-addon.sh legal-research-pack`
3. Script POSTs the JSON to `http://localhost:3000/api/addons/install` with their owner token

---

## Checklist for V1 Release

- [ ] Docker image builds cleanly from `agent-playground-desktop/`
- [ ] Image published to Docker Hub as `agentplayground/app:0.1.0`
- [ ] `docker-compose.yml` pulls from Hub (not local build)
- [ ] `start.bat` and `start.sh` tested on Windows and Mac
- [ ] First-run wizard completes successfully (fresh Docker volumes)
- [ ] App accessible at `http://localhost:3000` with no config needed
- [ ] VPS `/api/version` returns correct version string
- [ ] Download ZIP linked from agentplayground.net
