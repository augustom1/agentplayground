#!/bin/bash
set -e
echo "Starting AgentPlayground..."

# Create .env.local from template if it doesn't exist
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local from template."
fi

# Auto-generate AUTH_SECRET if it's still the placeholder value
if grep -q "replace-this-with-a-random-32-character-string" .env.local 2>/dev/null; then
  SECRET=$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 64)
  sed -i.bak "s|replace-this-with-a-random-32-character-string|$SECRET|g" .env.local
  rm -f .env.local.bak
  echo "Generated AUTH_SECRET automatically."
fi

docker compose up -d
echo ""
echo "Waiting for AgentPlayground to be ready..."

# Poll health endpoint — first run can take 60-90s (DB init + app build)
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    break
  fi
  sleep 3
  WAITED=$((WAITED + 3))
  printf "."
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "AgentPlayground is taking longer than expected to start."
  echo "Try visiting http://localhost:3000 in your browser in a minute."
else
  echo "AgentPlayground is ready!"
fi

if command -v open &>/dev/null; then
  open "http://localhost:3000"
elif command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:3000"
fi

echo "Open http://localhost:3000 in your browser."
echo "Run ./stop.sh to shut it down."
