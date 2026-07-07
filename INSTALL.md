# Installing AgentPlayground

## Requirements
- Docker Desktop 4.x or later — download at docker.com/products/docker-desktop
- 4GB RAM minimum (8GB recommended for Ollama)
- 5GB free disk space

## Steps

1. **Install Docker Desktop** if you haven't already — download at [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop). Make sure it's running (look for the whale icon in your taskbar).

2. **Extract this ZIP** to any folder on your computer.

3. **Start the app**:
   - Windows: double-click `start.bat`
   - Mac/Linux: open Terminal in this folder, run `./start.sh`

4. **Your browser will open** to http://localhost:3000. The setup wizard will guide you — it will ask for your API key during setup.

   No key yet? Get a **completely free** one at [build.nvidia.com](https://build.nvidia.com) (NVIDIA — free cloud models, no credit card), or a paid one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (OpenAI) / [console.anthropic.com](https://console.anthropic.com) (Anthropic).

## Stopping the app
Run `stop.bat` (Windows) or `./stop.sh` (Mac/Linux), or use Docker Desktop.

## Using local AI (Ollama — free, no API key needed)
Start with Ollama included:
```
docker compose -f docker-compose.yml -f docker-compose.ollama.yml up -d
```
Then select "Ollama" in the setup wizard. Note: requires 8GB+ RAM and may be slow on older machines.

## Updating your API key
Go to **Settings → API Keys** inside the app at any time.

---

## Troubleshooting

**"Docker not found"** — make sure Docker Desktop is open and running.

**First start is slow** — Docker needs to download images on first run (about 500MB). This can take a few minutes on slower connections.

**App doesn't open** — wait 30-60 seconds and visit [http://localhost:3000](http://localhost:3000) manually.

**Port 3000 already in use** — edit `docker-compose.yml`, change `"3000:3000"` to `"3001:3000"`, then access the app at port 3001.

**Need help?** — message the person who sent you this package. Include a screenshot of what you see — it helps a lot.
