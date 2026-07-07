# AgentPlayground

Run your own AI agent teams, locally and for free.

## What is it?

AgentPlayground is a local AI agent platform. You set up agent teams (a coordinator delegates work to specialized agents), build a knowledge Brain they read from, and organize everything into Playgrounds by context.

It can run **100% free** two ways: NVIDIA's free cloud models (one free API key, no credit card) or fully local models via Ollama. It also works with Anthropic Claude and OpenAI if you have keys — and you can mix providers per conversation: coordinator on Claude, teams on free models.

## Quick Start

1. Install Docker Desktop (docker.com)
2. Download the latest release from [agentplayground.net/download](https://agentplayground.net/download)
3. Run `start.bat` (Windows) or `./start.sh` (Mac/Linux)
4. Open http://localhost:3000 — the setup wizard will guide you

You'll enter your API key inside the wizard (it's validated on the spot). No config file editing needed. See [INSTALL.md](INSTALL.md) for details and troubleshooting.

## Features

- Coordinator that routes and delegates work to specialized agent teams
- Quick task router: describe a task, confirm the suggested team, it runs in the background
- Knowledge Brain with semantic search — task results archive back into it automatically
- Playgrounds: organize teams by context (work, personal, education)
- Plans: set a goal, a council reviews the plan, teams execute it in parallel
- Pick your provider and model per conversation — Anthropic, OpenAI, NVIDIA (free), or Ollama (local), including any custom model id
- Scheduled recurring jobs for agent teams

## Requirements

Docker Desktop 4.x+, 4GB RAM minimum (8GB recommended for Ollama).

## License

MIT
