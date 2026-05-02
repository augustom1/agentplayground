#!/bin/sh
# Agent Dashboard — Container Entrypoint
# Runs as root to fix volume/socket permissions, then drops to nextjs.
set -e

# Validate required secrets
if [ -z "$AUTH_SECRET" ]; then
  echo "ERROR: AUTH_SECRET is not set. Generate one with: openssl rand -hex 32"
  exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "WARNING: ANTHROPIC_API_KEY is not set. Anthropic models will not work (Ollama models are still available)."
fi

# ── Fix volume mount permissions ──────────────────────────────────────────────
# Docker named volumes are created root-owned. Chown them to nextjs so the
# app can read/write files and protocols.
chown -R nextjs:nodejs /app/data/files /app/data/protocols 2>/dev/null || true

# ── Fix Docker socket permissions ────────────────────────────────────────────
# Allow the nextjs process to call Docker CLI for the Server Control page.
chmod 666 /var/run/docker.sock 2>/dev/null || true

# ── Database ─────────────────────────────────────────────────────────────────
echo "▶ Applying database schema..."
su-exec nextjs node node_modules/prisma/build/index.js db push --accept-data-loss || {
  echo "ERROR: prisma db push failed. Check your DATABASE_URL and Postgres connection."
  exit 1
}

echo "▶ Starting application..."
exec su-exec nextjs node server.js
