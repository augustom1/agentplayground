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
