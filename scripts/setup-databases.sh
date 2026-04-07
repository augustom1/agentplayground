#!/bin/bash
# ─────────────────────────────────────────────────────────────────
# AgentPlayground — Database Setup Agent
# ─────────────────────────────────────────────────────────────────
# Idempotent: safe to run multiple times.
# Run this AFTER `docker compose up -d` and once PostgreSQL is healthy.
#
# What it does:
#   1. Creates agent_dashboard + n8n databases (if missing)
#   2. Enables pgvector extension
#   3. Runs all Prisma migrations
#   4. Optionally seeds demo data and a first admin user
#
# Usage:
#   bash scripts/setup-databases.sh
#   bash scripts/setup-databases.sh --seed-demo     # also seed demo data
#   bash scripts/setup-databases.sh --admin-only    # only create admin user
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────
ENV_FILE="${ENV_FILE:-.env.local}"
if [ ! -f "$ENV_FILE" ]; then ENV_FILE=".env"; fi
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a && source "$ENV_FILE" && set +a
fi

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_DB="${POSTGRES_DB:-agent_dashboard}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
SEED_DEMO="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()    { echo -e "${BLUE}[db-setup]${NC} $1"; }
ok()     { echo -e "${GREEN}[db-setup]${NC} ✓ $1"; }
warn()   { echo -e "${YELLOW}[db-setup]${NC} ⚠ $1"; }
error()  { echo -e "${RED}[db-setup]${NC} ✗ $1"; exit 1; }

PSQL="psql -h $DB_HOST -p $DB_PORT -U $POSTGRES_USER"
if [ -n "$POSTGRES_PASSWORD" ]; then
  export PGPASSWORD="$POSTGRES_PASSWORD"
fi

# ── Wait for Postgres ──────────────────────────────────────────────
log "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
MAX_ATTEMPTS=30
ATTEMPT=0
until $PSQL -c '\q' 2>/dev/null; do
  ATTEMPT=$((ATTEMPT+1))
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    error "PostgreSQL did not become ready in time. Is Docker running? Check: docker compose ps"
  fi
  sleep 2
done
ok "PostgreSQL is ready"

# ── Create databases ───────────────────────────────────────────────
log "Creating databases..."

$PSQL -c "SELECT 'CREATE DATABASE $POSTGRES_DB' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$POSTGRES_DB')\gexec" 2>/dev/null
ok "Database '$POSTGRES_DB' ready"

$PSQL -c "SELECT 'CREATE DATABASE n8n' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec" 2>/dev/null
ok "Database 'n8n' ready"

# ── Enable pgvector extension ──────────────────────────────────────
log "Enabling pgvector extension..."
$PSQL -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null
ok "pgvector extension enabled"

$PSQL -d "$POSTGRES_DB" -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" 2>/dev/null
ok "pgcrypto extension enabled (for gen_random_uuid)"

# ── Run Prisma migrations ──────────────────────────────────────────
log "Running Prisma migrations..."
if command -v npx &>/dev/null; then
  npx prisma migrate deploy
  ok "Prisma migrations applied"
else
  warn "npx not found — skipping Prisma migrations. Run manually: npx prisma migrate deploy"
fi

# ── Check for pending migrations ────────────────────────────────────
log "Checking schema status..."
if command -v npx &>/dev/null; then
  # Run pending migration for file management if not applied
  MIGRATION_CHECK=$(npx prisma migrate status 2>&1 || true)
  if echo "$MIGRATION_CHECK" | grep -q "Following migration(s) have not yet been applied"; then
    warn "There are pending migrations. Applying..."
    npx prisma migrate deploy
  else
    ok "All migrations are up to date"
  fi
fi

# ── Verify key tables ──────────────────────────────────────────────
log "Verifying tables..."
TABLES=("users" "agent_teams" "agents" "tasks" "skills" "file_records" "file_embeddings" "api_usage" "user_credits")
for TABLE in "${TABLES[@]}"; do
  if $PSQL -d "$POSTGRES_DB" -c "\d $TABLE" &>/dev/null; then
    ok "Table '$TABLE' exists"
  else
    warn "Table '$TABLE' is missing — run: npx prisma migrate dev --name add-file-management"
  fi
done

# ── Seed: Admin User ────────────────────────────────────────────────
if [[ "$SEED_DEMO" == "--seed-demo" || "$SEED_DEMO" == "--admin-only" ]]; then
  log "Creating initial admin user..."

  # Prompt for admin credentials
  read -rp "  Admin email [admin@agentplayground.net]: " ADMIN_EMAIL
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@agentplayground.net}"

  read -rsp "  Admin password: " ADMIN_PASS
  echo ""

  if [ -z "$ADMIN_PASS" ]; then
    error "Password cannot be empty"
  fi

  # Create admin via the /api/auth/setup endpoint (handles bcrypt hashing)
  DASHBOARD_URL="${NEXTAUTH_URL:-http://localhost:3000}"
  SETUP_RESPONSE=$(curl -s -X POST "$DASHBOARD_URL/api/auth/setup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"name\":\"Admin\"}" 2>/dev/null || true)

  if echo "$SETUP_RESPONSE" | grep -q '"id"'; then
    ok "Admin user created: $ADMIN_EMAIL"
  elif echo "$SETUP_RESPONSE" | grep -q "already exists\|Admin user already"; then
    warn "Admin user already exists — skipping"
  else
    warn "Could not create admin via API. Dashboard may not be running. Start it first, then visit /setup in your browser."
    warn "Response: $SETUP_RESPONSE"
  fi
fi

# ── Seed: Demo Teams ────────────────────────────────────────────────
if [[ "$SEED_DEMO" == "--seed-demo" ]]; then
  log "Seeding demo agent teams..."
  if command -v npx &>/dev/null && [ -f "scripts/seed-teams.ts" ]; then
    npx ts-node scripts/seed-teams.ts || warn "Team seeding failed — run manually: npx ts-node scripts/seed-teams.ts"
    ok "Demo teams seeded"
  else
    warn "seed-teams.ts not found or npx not available — skip team seeding"
  fi
fi

# ── Create files directory ─────────────────────────────────────────
log "Ensuring file storage directory exists..."
FILES_DIR="${FILES_ROOT:-$(pwd)/data/files}"
mkdir -p "$FILES_DIR"
ok "File storage ready at: $FILES_DIR"

# Create a README in the files directory
cat > "$FILES_DIR/README.md" <<'FILEREADME'
# AgentPlayground — Shared File Storage

This directory is the root of the shared file storage available to all agents.

## How it works
- Files here are accessible to all AI agents via the `list_files`, `read_file`, and `write_file` tools
- Text files can be **embedded** into the vector database (via the Files page → Embed button)
- Embedded files can be **semantically searched** by agents using the `search_files` tool

## Suggested structure
```
/reports/         Agent-generated reports and analyses
/data/            Input datasets (CSV, JSON, etc.)
/knowledge/       Documentation, SOPs, reference material (embed these!)
/code/            Generated code snippets and scripts
/inbox/           Files uploaded for processing
/archive/         Completed/processed files
```

## Embedding for AI search
Upload a text file → click "Embed" → agents can now find it with natural language queries.
Requires Ollama + nomic-embed-text model:
  docker exec vps-ollama ollama pull nomic-embed-text
FILEREADME

ok "README created in file storage"

# ── Done ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Database setup complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. If tables were missing, run:"
echo "       npx prisma migrate dev --name add-file-management"
echo "  2. Pull the embedding model:"
echo "       docker exec vps-ollama ollama pull nomic-embed-text"
echo "  3. Seed pre-built agent teams:"
echo "       npx ts-node scripts/seed-teams.ts"
echo "  4. Open the dashboard and create your admin account at /setup"
echo ""
