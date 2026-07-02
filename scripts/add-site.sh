#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# add-site.sh — Add a new static website to the Nginx hosting stack
#
# Usage:
#   ./add-site.sh <hostname>
#
# Examples:
#   ./add-site.sh clientname.mycompany.com
#   ./add-site.sh portfolio.mycompany.com
#   ./add-site.sh anotherbusiness.com
#
# What it does:
#   1. Creates webroot/SITENAME/ with a placeholder index.html
#   2. Creates sites/SITENAME.conf with an Nginx server block
#   3. Reloads Nginx (zero downtime)
#   4. Tells you the Traefik label to add if the site needs its own subdomain
# ─────────────────────────────────────────────────────────────────
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error(){ echo -e "${RED}[✗]${NC} $1"; exit 1; }

HOSTNAME="$1"
[[ -z "$HOSTNAME" ]] && error "Usage: $0 <hostname>   (e.g. ./add-site.sh client.mycompany.com)"

# Sanitize hostname into a safe directory/filename (replace dots and hyphens with underscores)
SITE_NAME=$(echo "$HOSTNAME" | tr '.' '_' | tr '-' '_')
WEBROOT="webroot/${SITE_NAME}"
CONF="sites/${SITE_NAME}.conf"

[[ -f "$CONF" ]] && error "Site already exists: $CONF"

# ── Create web directory ───────────────────────────────────────────
mkdir -p "$WEBROOT"

# ── Placeholder index.html ─────────────────────────────────────────
cat > "${WEBROOT}/index.html" <<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${HOSTNAME}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0a0a0a; color: #f5f5f5;
      min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem;
    }
    .card {
      text-align: center; max-width: 520px; width: 100%;
      background: #111; border: 1px solid #222; border-radius: 16px; padding: 3rem 2.5rem;
    }
    h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.75rem; }
    p { color: #777; font-size: 0.95rem; line-height: 1.6; }
    code { background: #1a1a1a; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.85em; color: #6366f1; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${HOSTNAME}</h1>
    <p>Site is live. Replace this file at <code>${WEBROOT}/index.html</code> with your content.</p>
  </div>
</body>
</html>
HTML

log "Created ${WEBROOT}/index.html"

# ── Nginx server block ─────────────────────────────────────────────
cat > "$CONF" <<NGINXCONF
# Site: ${HOSTNAME}
# Added: $(date)
server {
    listen 80;
    server_name ${HOSTNAME};
    root /var/www/${SITE_NAME};
    index index.html index.htm;

    location / {
        try_files \$uri \$uri/ =404;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
NGINXCONF

log "Created ${CONF}"

# ── Reload Nginx ───────────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q "^vps-nginx$"; then
  docker exec vps-nginx nginx -t && docker exec vps-nginx nginx -s reload
  log "Nginx reloaded — site is live"
else
  warn "Nginx container not running. Start the stack first, then run: docker exec vps-nginx nginx -s reload"
fi

# ── Print next steps ───────────────────────────────────────────────
echo ""
echo -e "  ${GREEN}Site added:${NC} ${HOSTNAME}"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "  1. Upload your HTML/CSS/JS files to: ${CYAN}${WEBROOT}/${NC}"
echo ""

# Detect if it looks like an external domain (not a subdomain of current domain)
if ! grep -q "^DOMAIN=" .env.local 2>/dev/null; then
  echo -e "  2. Point an A record for ${HOSTNAME} to this VPS IP."
else
  ROOT_DOMAIN=$(grep '^DOMAIN=' .env.local | cut -d= -f2)
  if [[ "$HOSTNAME" == *"${ROOT_DOMAIN}"* ]]; then
    echo -e "  2. DNS: already covered by your wildcard A record (*.${ROOT_DOMAIN} → VPS IP)"
    echo -e "  3. For HTTPS on this subdomain, add a Traefik label to the nginx service"
    echo -e "     in docker-compose.prod.yml — or use the wildcard cert approach."
  else
    echo -e "  2. DNS: add an A record for ${HOSTNAME} pointing to this VPS IP."
    echo -e "  3. For HTTPS, add a Traefik router label to the nginx service"
    echo -e "     in docker-compose.prod.yml:"
    echo ""
    echo -e "     ${CYAN}traefik.http.routers.${SITE_NAME}.rule=Host(\`${HOSTNAME}\`)${NC}"
    echo -e "     ${CYAN}traefik.http.routers.${SITE_NAME}.tls.certresolver=le${NC}"
    echo ""
    echo -e "     Then restart: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
  fi
fi
echo ""
