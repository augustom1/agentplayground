# VPS Client Onboarding Playbook

Step-by-step guide for delivering a VPS setup to a new client.
Estimated total time: 4–5 hours (mostly waiting on DNS/downloads).

---

## Pre-Sale Checklist

Before signing a client, confirm:
- [ ] What is their primary use case? (automation, website, agents, all three)
- [ ] Do they have a domain? (or do they need one — register at cost + $20 fee)
- [ ] How many team members will use the dashboard?
- [ ] Do they need Claude (Anthropic API) or is local LLM (qwen2.5) enough?
- [ ] What's their monthly traffic/data volume? (affects VPS tier choice)
- [ ] GDPR / data residency requirements? (affects datacenter region choice)
- [ ] Do they want n8n workflows now or later?

Use Natasha (DevOps team) to recommend the right VPS tier once you have these answers.

---

## Step 1 — Provision the VPS (30 min)

**Hetzner (recommended):**
1. Log in at console.hetzner.cloud
2. New Project → name it `client-name-vps`
3. Create Server:
   - Location: EU (Nuremberg/Helsinki) for EU clients, US (Ashburn) for US clients
   - Image: Ubuntu 22.04 LTS
   - Type: CX32 (16GB) for Starter, CX42 (32GB) for Growth
   - SSH key: add your public key
   - Name: `client-name-prod`
4. Note the public IP address

**Contabo alternative:**
- Cheaper for storage-heavy use cases
- Slower support, less reliable than Hetzner
- Use when client needs 200GB+ storage and low budget

---

## Step 2 — DNS Setup (15 min + up to 48h propagation)

At the client's DNS provider (Cloudflare recommended — free):
1. Add A record: `@` → VPS IP (main domain)
2. Add A record: `*` → VPS IP (wildcard — covers all subdomains)
3. Set TTL to 300 (5 min) for fast propagation

Subdomains that will be live after deployment:
- `app.domain.com` — Agent Playground dashboard
- `n8n.domain.com` — n8n automation
- `ai.domain.com` — Open WebUI (Ollama)
- `files.domain.com` — FileBrowser
- `manage.domain.com` — Portainer
- `domain.com` — Static website (Nginx)

**Don't proceed to SSL steps until DNS has propagated.** Check with:
```
nslookup app.domain.com
# Should return the VPS IP
```

---

## Step 3 — Clone the Repo & Run Setup (1–2 hrs including model download)

SSH into the VPS:
```bash
ssh root@[VPS-IP]
```

Clone the repo:
```bash
git clone https://github.com/[YOUR_REPO].git /opt/vps
cd /opt/vps
```

Run the bootstrap:
```bash
bash setup.sh
```

The script will ask for:
- Domain (e.g. `clientdomain.com`)
- Email for SSL certs
- PostgreSQL password (generate a strong one, store it)
- n8n admin username/password
- Anthropic API key (optional — press Enter to skip, can add later)

It will then:
1. Install Docker
2. Write `.env.local`
3. Start all Docker services
4. Build the custom Ollama image
5. Start downloading qwen2.5:3b and qwen2.5:7b models (~6GB, takes 10–20 min)

**Monitor Ollama download progress:**
```bash
docker logs -f vps-ollama
```

---

## Step 4 — Verify All Services Are Healthy (15 min)

```bash
docker compose ps
```

All containers should show `healthy` or `running`. Common issues:

| Container shows "unhealthy" | Fix |
|---|---|
| vps-ollama | Models still downloading — wait, check logs |
| vps-dashboard | Check: docker logs vps-dashboard — likely DB or AUTH_SECRET missing |
| vps-postgres | Check: docker logs vps-postgres — storage full? |
| vps-n8n | Check N8N_ENCRYPTION_KEY is set in .env.local |

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":"..."}
```

---

## Step 5 — First-Run Account Setup (15 min)

1. Open `https://app.clientdomain.com` in browser
2. If SSL isn't ready yet: wait 2–5 min for Traefik to get Let's Encrypt cert
3. You'll see the `/setup` page (one-time admin creation)
4. Create the admin account:
   - Email: client's preferred email
   - Password: generate a strong one, send via secure channel (Bitwarden Send, etc.)

5. Log in and verify the dashboard loads

---

## Step 6 — Configure Agent Teams (30–60 min)

Run the seed script to create the default team structure:
```bash
docker exec vps-dashboard npx tsx scripts/seed-teams.ts
```

Or configure manually through the UI:
1. Go to Agent Teams → New Team
2. Create teams matching client's use case (see Client Use Case Templates below)
3. Add agents to each team with appropriate system prompts and models
4. Test chat with each team

**For clients who only need local LLM:**
- Set model to `qwen2.5:3b` (fast) or `qwen2.5:7b` (quality)
- No Anthropic API key needed

**For clients who want Claude:**
- Add `ANTHROPIC_API_KEY` to `/opt/vps/.env.local`
- Restart dashboard: `docker compose restart dashboard`

---

## Step 7 — Set Up n8n (30 min)

1. Open `https://n8n.clientdomain.com`
2. Log in with the credentials from setup.sh
3. Create a first workflow as a proof of concept (e.g., daily summary email, webhook→agent trigger)
4. Show client how to add their own workflows

Useful n8n integrations to configure first:
- Webhook node (receives external triggers)
- HTTP Request node (calls dashboard API or agent endpoints)
- Email/Gmail node (client's email account)
- Schedule trigger (for time-based automations)

---

## Step 8 — Onboarding Call (1 hr)

Agenda:
1. Show them the dashboard URL and log in together (10 min)
2. Walk through: Dashboard → Chat → Agent Lab → Schedule (20 min)
3. Demonstrate: open chat, ask an agent to create a task — show it happen live (10 min)
4. Open n8n, show the workflow you built for them (10 min)
5. Explain: where to find FileBrowser, Open WebUI, Portainer (5 min)
6. Q&A + agree on next workflow or agent team to build (15 min)

Send after call:
- Written summary of what was set up
- Credentials (via Bitwarden Send or similar — never plain email)
- Link to documentation / how-to guides
- Your contact info for support

---

## Step 9 — Post-Delivery (ongoing)

Set up automated backup:
```bash
# Add to root crontab (crontab -e)
0 2 * * * cd /opt/vps && ./backup-db.sh
```

Set a reminder to check on the client in 2 weeks:
- Are they using it?
- Any errors in the logs?
- Ready to build the next workflow?

---

## Client Use Case Templates

### Marketing Agency
Teams to create:
- **Content Team** — blog posts, social copy, email drafts
- **Research Team** — competitor analysis, trend reports, web browsing
- **Reporting Team** — weekly summaries pulled from n8n data

### Law Firm / Consultant
Teams to create:
- **Document Review** — local LLM only (qwen2.5:7b), data never leaves server
- **Client Intake** — intake summaries, next steps
- **Research** — legal research with web browsing agents

### E-commerce / Retail
Teams to create:
- **Customer Support** — FAQ, order status, returns (connect to Shopify via n8n)
- **Inventory Alerts** — scheduled checks, low stock notifications
- **Marketing Copy** — product descriptions, email campaigns

### Solo Freelancer
Teams to create:
- **Project Manager** — task tracking, deadline reminders
- **Proposal Writer** — client proposals from a brief
- **Admin** — invoice reminders, email drafts

---

## Troubleshooting Reference

| Problem | Command to run |
|---|---|
| Service down | `docker compose ps && docker logs [container]` |
| Out of disk | `df -h` — clear old Docker images: `docker system prune` |
| Out of RAM | `free -h` — consider VPS upgrade |
| SSL cert expired | `docker compose restart traefik` (auto-renews) |
| Forgot .env.local | `cat /opt/vps/.env.local` |
| Re-deploy after update | `git pull && docker compose up -d --build` |
| Full reset | `docker compose down -v && bash setup.sh` (destroys all data) |
