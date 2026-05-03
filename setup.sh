#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  VPS Master Stack — One-Command Bootstrap
#  Run on a fresh Ubuntu/Debian VPS:
#
#    git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /opt/vps
#    cd /opt/vps && bash setup.sh
#
# ═══════════════════════════════════════════════════════════════════
set -e

# ── Colors ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
info()   { echo -e "${BLUE}[i]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
header() { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}\n"; }

# ── Must run on Linux ──────────────────────────────────────────────
[[ "$OSTYPE" != "linux-gnu"* ]] && error "This script requires Linux (Ubuntu/Debian)."

# ── Prefer running as root ─────────────────────────────────────────
SUDO=""
if [[ "$EUID" -ne 0 ]]; then
  warn "Not running as root — will use sudo for system commands."
  SUDO="sudo"
fi

clear
echo -e "${BOLD}${CYAN}"
echo "  ██╗   ██╗██████╗ ███████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗"
echo "  ██║   ██║██╔══██╗██╔════╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝"
echo "  ██║   ██║██████╔╝███████╗    ███████╗   ██║   ███████║██║     █████╔╝ "
echo "  ╚██╗ ██╔╝██╔═══╝ ╚════██║    ╚════██║   ██║   ██╔══██║██║     ██╔═██╗ "
echo "   ╚████╔╝ ██║     ███████║    ███████║   ██║   ██║  ██║╚██████╗██║  ██╗"
echo "    ╚═══╝  ╚═╝     ╚══════╝    ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝"
echo -e "${NC}"
echo -e "  Full-stack VPS setup: Dashboard · n8n · Ollama · Nginx · Portainer"
echo ""

# ══════════════════════════════════════════════════════════════════
header "1. Docker Installation"
# ══════════════════════════════════════════════════════════════════

if command -v docker &>/dev/null; then
  log "Docker already installed: $(docker --version)"
else
  info "Installing Docker via official script..."
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl start docker
  $SUDO systemctl enable docker

  # Add current user to docker group if not root
  if [[ -n "$SUDO_USER" ]]; then
    $SUDO usermod -aG docker "$SUDO_USER"
    warn "Added $SUDO_USER to docker group. Log out and back in for this to take effect."
  fi
  log "Docker installed: $(docker --version)"
fi

# Verify Compose v2
if ! docker compose version &>/dev/null; then
  error "Docker Compose v2 not found. Re-run after installing docker-compose-plugin."
fi
log "Docker Compose: $(docker compose version --short)"

# ══════════════════════════════════════════════════════════════════
header "2. Environment Configuration"
# ══════════════════════════════════════════════════════════════════

ENV_FILE=".env.local"

if [[ -f "$ENV_FILE" ]]; then
  warn "$ENV_FILE already exists — skipping configuration prompts."
  warn "To reconfigure, delete $ENV_FILE and re-run setup.sh."
else
  info "Enter your configuration. Secrets are auto-generated where possible."
  echo ""

  # ── Domain & Email ───────────────────────────────────────────────
  read -rp "  Your domain (e.g. mycompany.com): " DOMAIN
  [[ -z "$DOMAIN" ]] && error "Domain is required."

  read -rp "  Email for SSL certificates: " ACME_EMAIL
  [[ -z "$ACME_EMAIL" ]] && error "Email is required for Let's Encrypt."

  # ── Database ─────────────────────────────────────────────────────
  echo ""
  read -rsp "  PostgreSQL password (strong, save this): " POSTGRES_PASSWORD; echo
  [[ -z "$POSTGRES_PASSWORD" ]] && error "PostgreSQL password is required."

  # ── n8n ──────────────────────────────────────────────────────────
  echo ""
  read -rp "  n8n admin username [admin]: " N8N_BASIC_AUTH_USER
  N8N_BASIC_AUTH_USER="${N8N_BASIC_AUTH_USER:-admin}"
  read -rsp "  n8n admin password: " N8N_BASIC_AUTH_PASSWORD; echo
  [[ -z "$N8N_BASIC_AUTH_PASSWORD" ]] && error "n8n password is required."

  # ── Anthropic API key ────────────────────────────────────────────
  echo ""
  read -rp "  Anthropic API key (sk-ant-..., press Enter to skip): " ANTHROPIC_API_KEY

  # ── Ollama data path (use a dedicated disk/volume to keep models off root) ──
  echo ""
  info "Ollama models can be large (3–15 GB each). Point this at a dedicated"
  info "volume/disk so they don't fill your root disk."
  info "Examples: /mnt/ollama-data (Hetzner block volume)  or  /var/lib/ollama (root disk)"
  read -rp "  Ollama data path [/var/lib/ollama]: " OLLAMA_DATA_PATH
  OLLAMA_DATA_PATH="${OLLAMA_DATA_PATH:-/var/lib/ollama}"
  $SUDO mkdir -p "$OLLAMA_DATA_PATH"
  log "Ollama data path: $OLLAMA_DATA_PATH"

  # ── Auto-generate secrets ────────────────────────────────────────
  gen_secret() { openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 64; }
  CRON_SECRET=$(gen_secret)
  N8N_ENCRYPTION_KEY=$(gen_secret)
  AUTH_SECRET=$(gen_secret)
  REDIS_PASSWORD=$(gen_secret | cut -c1-24)

  # ── Write .env.local ─────────────────────────────────────────────
  cat > "$ENV_FILE" <<EOF
# ─────────────────────────────────────────────────────────────────
# VPS Master Stack — Environment Variables
# Generated by setup.sh on $(date)
# KEEP THIS FILE PRIVATE — never commit to git
# ─────────────────────────────────────────────────────────────────

# ── Domain ───────────────────────────────────────────────────────
DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL}

# ── PostgreSQL (shared across all services) ───────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=agent_dashboard

# ── Redis ────────────────────────────────────────────────────────
REDIS_PASSWORD=${REDIS_PASSWORD}

# ── Agent Dashboard ───────────────────────────────────────────────
AUTH_SECRET=${AUTH_SECRET}
NEXTAUTH_URL=https://app.${DOMAIN}
NEXT_PUBLIC_APP_URL=https://app.${DOMAIN}
CRON_SECRET=${CRON_SECRET}

# ── AI Provider ──────────────────────────────────────────────────
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

# ── Ollama ───────────────────────────────────────────────────────
# Path on the HOST where Ollama stores models. Use a dedicated volume.
# On Hetzner: mount the block volume at /mnt/ollama-data and set this.
OLLAMA_DATA_PATH=${OLLAMA_DATA_PATH}
# Models to auto-pull on every container start (space-separated, no-op if present)
# RAM guide: 3b ~2GB | 7b ~5GB | 14b ~9GB (fits in 16 GB RAM)
OLLAMA_AUTO_PULL=qwen2.5:3b qwen2.5:7b

# ── n8n ──────────────────────────────────────────────────────────
N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
N8N_BASIC_AUTH_USER=${N8N_BASIC_AUTH_USER}
N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_AUTH_PASSWORD}
N8N_HOST=n8n.${DOMAIN}
N8N_PROTOCOL=https

# ── Port overrides (optional — only needed for local dev) ─────────
# DASHBOARD_PORT=3000
# N8N_PORT=5678
# OLLAMA_PORT=11434
# NGINX_PORT=8082
# FILEBROWSER_PORT=8083
# PORTAINER_PORT=9000
EOF

  log "Configuration written to $ENV_FILE"
fi

# ══════════════════════════════════════════════════════════════════
header "3. Directory Structure"
# ══════════════════════════════════════════════════════════════════

mkdir -p scripts sites webroot/main webroot/default
log "Directories: scripts/ sites/ webroot/"

# ── init-db.sh (idempotent — only runs on first Postgres start) ────
if [[ ! -f "scripts/init-db.sh" ]]; then
  cat > scripts/init-db.sh <<'INITDB'
#!/usr/bin/env bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE n8n'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec
EOSQL
echo "[init-db] Additional databases created."
INITDB
  chmod +x scripts/init-db.sh
  log "Created scripts/init-db.sh"
fi

# ── Nginx default config ───────────────────────────────────────────
SRC_DOMAIN=$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)

if [[ ! -f "sites/default.conf" ]]; then
  cat > sites/default.conf <<NGINXCONF
# ── Main company website ─────────────────────────────────────
server {
    listen 80;
    server_name ${SRC_DOMAIN} www.${SRC_DOMAIN};
    root /var/www/main;
    index index.html index.htm;

    location / {
        try_files \$uri \$uri/ =404;
    }

    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}

# ── Catch-all (default) ──────────────────────────────────────
server {
    listen 80 default_server;
    server_name _;
    root /var/www/default;
    index index.html;
    location / {
        try_files \$uri \$uri/ =404;
    }
}
NGINXCONF
  log "Created sites/default.conf"
fi

# ── Company website placeholder ────────────────────────────────────
if [[ ! -f "webroot/main/index.html" ]]; then
  cat > webroot/main/index.html <<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${SRC_DOMAIN}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0a0a0a;
      color: #f5f5f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      text-align: center;
      max-width: 560px;
      width: 100%;
      background: #111;
      border: 1px solid #222;
      border-radius: 16px;
      padding: 3rem 2.5rem;
    }
    h1 { font-size: 2.5rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    .dot { color: #6366f1; }
    p { color: #888; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem; }
    .btn {
      display: inline-block;
      background: #6366f1;
      color: #fff;
      text-decoration: none;
      padding: 0.75rem 1.75rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.95rem;
      transition: background 0.2s;
    }
    .btn:hover { background: #4f46e5; }
    .footer { margin-top: 2rem; font-size: 0.8rem; color: #555; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${SRC_DOMAIN}<span class="dot">.</span></h1>
    <p>
      Replace this page by editing <code>webroot/main/index.html</code> on your VPS,
      or use <code>./add-site.sh</code> to add new client sites.
    </p>
    <a href="https://app.${SRC_DOMAIN}" class="btn">→ Open Dashboard</a>
    <div class="footer">Powered by your VPS stack</div>
  </div>
</body>
</html>
HTML
  log "Created webroot/main/index.html (placeholder)"
fi

# ── Default 404 page ───────────────────────────────────────────────
if [[ ! -f "webroot/default/index.html" ]]; then
  cat > webroot/default/index.html <<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Not Found</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #888;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    h1 { color: #f5f5f5; }
  </style>
</head>
<body><div style="text-align:center"><h1>404</h1><p>Site not found.</p></div></body>
</html>
HTML
fi

# ══════════════════════════════════════════════════════════════════
header "4. Starting the Stack"
# ══════════════════════════════════════════════════════════════════

info "Building and starting all services (first run pulls images — may take 5–10 min)..."
docker compose --env-file .env.local -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# ══════════════════════════════════════════════════════════════════
header "5. Waiting for Core Services"
# ══════════════════════════════════════════════════════════════════

info "Waiting for PostgreSQL..."
RETRIES=0
until docker exec vps-postgres pg_isready -U postgres &>/dev/null; do
  RETRIES=$((RETRIES + 1))
  [[ $RETRIES -ge 40 ]] && error "PostgreSQL did not become ready. Check: docker logs vps-postgres"
  sleep 3
done
log "PostgreSQL is ready"

info "Waiting for Dashboard..."
RETRIES=0
until docker exec vps-dashboard wget -qO- http://localhost:3000/api/health &>/dev/null; do
  RETRIES=$((RETRIES + 1))
  [[ $RETRIES -ge 40 ]] && { warn "Dashboard health check timed out — it may still be migrating. Check: docker logs vps-dashboard"; break; }
  sleep 5
done
[[ $RETRIES -lt 40 ]] && log "Dashboard is ready"

# ══════════════════════════════════════════════════════════════════
header "6. Seeding Default Agent Teams"
# ══════════════════════════════════════════════════════════════════

info "Seeding 5 default agent teams (Dev Core, DevOps, Product, Business, Command Center)..."
CURRENT_CRON_SECRET=$(grep '^CRON_SECRET=' "$ENV_FILE" | cut -d= -f2)
SEED_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/seed \
  -H "Authorization: Bearer ${CURRENT_CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo "000")

if [[ "$SEED_STATUS" == "200" ]]; then
  log "Default teams seeded — app is ready to use"
else
  warn "Seeding returned HTTP $SEED_STATUS — non-critical. Teams can be seeded later via:"
  warn "  curl -X POST https://app.${SRC_DOMAIN}/api/admin/seed -H 'Authorization: Bearer \$CRON_SECRET'"
fi

# ══════════════════════════════════════════════════════════════════
header "7. Ollama LLM Models"
# ══════════════════════════════════════════════════════════════════

info "Ollama is pulling models automatically in the background:"
info "  • qwen2.5:3b  (~1.9 GB) — fast, structured tasks, coding, automation"
info "  • qwen2.5:7b  (~4.4 GB) — stronger reasoning, same family = consistent behavior"
warn "First-time model download may take 5–20 min depending on your connection."
warn "Track progress with: docker logs -f vps-ollama"
echo ""
info "To add more models, set OLLAMA_AUTO_PULL in .env.local and restart:"
info "  OLLAMA_AUTO_PULL=\"qwen2.5:3b qwen2.5:7b llama3.1:8b\""

# ══════════════════════════════════════════════════════════════════
header "Setup Complete"
# ══════════════════════════════════════════════════════════════════

echo -e "${GREEN}${BOLD}  Your VPS stack is live!${NC}"
echo ""

# ── Step 1: Create admin account ─────────────────────────────────
echo -e "  ${BOLD}${YELLOW}► FIRST: Create your admin account${NC}"
echo -e "  ${CYAN}https://app.${SRC_DOMAIN}/setup${NC}"
echo -e "  (This screen appears only once — sets your email + password)"
echo ""

# ── Services ──────────────────────────────────────────────────────
echo -e "  ${BOLD}Services:${NC}"
echo -e "  ${CYAN}https://app.${SRC_DOMAIN}${NC}        Agent Dashboard"
echo -e "  ${CYAN}https://n8n.${SRC_DOMAIN}${NC}        n8n Automation"
echo -e "  ${CYAN}https://files.${SRC_DOMAIN}${NC}      FileBrowser"
echo -e "  ${CYAN}https://manage.${SRC_DOMAIN}${NC}     Portainer (Docker UI)"
echo -e "  ${CYAN}https://${SRC_DOMAIN}${NC}            Your Website (Nginx)"
echo ""

# ── DNS ───────────────────────────────────────────────────────────
echo -e "  ${BOLD}Required DNS records (point both to this server's IP):${NC}"
echo -e "  ${YELLOW}A  @   → $(curl -sf https://api.ipify.org 2>/dev/null || echo '<your VPS IP>')${NC}"
echo -e "  ${YELLOW}A  *   → same IP   (wildcard covers all subdomains)${NC}"
echo ""

# ── What's next ───────────────────────────────────────────────────
echo -e "  ${BOLD}After creating your admin account:${NC}"
echo -e "  1. Log in and open Chat — 5 agent teams are pre-loaded"
echo -e "  2. Add your Anthropic API key to .env.local for Claude models"
echo -e "  3. Set up Telegram bot (optional) — any message saves to vault"
echo -e "  4. Configure n8n workflows for email/automation pipelines"
echo ""

# ── Common commands ───────────────────────────────────────────────
echo -e "  ${BOLD}Common commands:${NC}"
echo -e "  Logs:         ${CYAN}docker compose logs -f dashboard${NC}"
echo -e "  All status:   ${CYAN}docker compose ps${NC}"
echo -e "  Rebuild app:  ${CYAN}docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard${NC}"
echo -e "  DB backup:    ${CYAN}./backup-db.sh${NC}"
echo -e "  Re-seed teams:${CYAN}curl -X POST https://app.${SRC_DOMAIN}/api/admin/seed -H 'Authorization: Bearer \$(grep CRON_SECRET .env.local | cut -d= -f2)'${NC}"
echo ""

log "Done. Visit ${CYAN}https://app.${SRC_DOMAIN}/setup${NC} to create your admin account."
