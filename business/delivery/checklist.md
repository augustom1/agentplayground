# Master Delivery Checklist

Use this for every installation. Copy it per client, fill in their data.

---

## Client Info
- **Name:**
- **Email:**
- **WhatsApp:**
- **Order ID (MP external_reference):**
- **Plan purchased:** [ ] Básico  [ ] Stack Completo  [ ] Premium
- **VPS provider:**
- **VPS IP:**
- **Domain:**
- **SSH access received:** [ ] Yes  [ ] No
- **Date received:**
- **Target delivery date:**

---

## Phase 0 — Pre-flight (before touching the VPS)

- [ ] Confirm payment is "approved" in MercadoPago dashboard
- [ ] Send client "payment received" email (template: `email-templates.md`)
- [ ] Receive SSH access (root or sudo user + password or key)
- [ ] Confirm domain DNS: A record `@` and `*` pointing to VPS IP
  - Use `nslookup DOMAIN` or `dig DOMAIN` to verify
  - DNS propagation can take up to 24h — don't start until it resolves
- [ ] Confirm VPS meets minimum specs: Ubuntu 22.04+, 4GB RAM, 40GB disk
- [ ] Run: `ssh root@IP "uname -a && free -h && df -h"` — save output

---

## Phase 1 — Stack Installation (all plans)

- [ ] Clone repo to `/opt/agentplayground`:
  ```bash
  git clone https://github.com/augustom1/agentplayground-public /opt/agentplayground
  cd /opt/agentplayground
  ```
- [ ] Run `setup.sh` (installs Docker if not present):
  ```bash
  bash setup.sh
  ```
- [ ] Edit `.env.local` with client values:
  - `DOMAIN=clientdomain.com`
  - `ACME_EMAIL=client@email.com`
  - `POSTGRES_PASSWORD=` (generate: `openssl rand -hex 16`)
  - `AUTH_SECRET=` (generate: `openssl rand -hex 32`)
  - `CRON_SECRET=` (generate: `openssl rand -hex 32`)
  - `N8N_ENCRYPTION_KEY=` (generate: `openssl rand -hex 32`)
  - `N8N_BASIC_AUTH_PASSWORD=` (generate strong password)
- [ ] Start the stack:
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  ```
- [ ] Wait for all containers to be healthy:
  ```bash
  docker compose ps
  ```
- [ ] Verify HTTPS works:
  - [ ] `https://DOMAIN` loads (Nginx)
  - [ ] `https://n8n.DOMAIN` loads (n8n)
  - [ ] `https://files.DOMAIN` loads (FileBrowser)
  - [ ] `https://manage.DOMAIN` loads (Portainer)

**Básico stops here.** Go to Phase 4 (delivery).

---

## Phase 2 — AgentPlayground Setup (Stack Completo + Premium)

- [ ] Verify `https://app.DOMAIN` is reachable
- [ ] Navigate to `https://app.DOMAIN/setup`
- [ ] Create the client's admin account:
  - Name: [client name]
  - Email: [client email]
  - Password: (generate strong password)
- [ ] Log in, verify dashboard loads
- [ ] Run first-time seed:
  ```bash
  docker exec -it vps-dashboard npx tsx scripts/seed-teams.ts
  ```
- [ ] Verify 5 agent teams appear in Agent Lab
- [ ] Wait for Ollama to pull models (check logs):
  ```bash
  docker logs vps-ollama --tail 50 -f
  ```
  - qwen2.5:3b pulls in ~5 min on good connection
  - qwen2.5:7b pulls in ~10–15 min
- [ ] Test a chat: go to Chat, send "Hola, ¿podés presentarte?"
  - If Anthropic key is not set, select Ollama provider + qwen2.5:7b in the chat selector
  - Verify streaming response works
- [ ] Screenshot the working dashboard (for delivery proof)

---

## Phase 3 — Premium Extras (Premium only)

- [ ] Live onboarding call scheduled: [date/time]
- [ ] Configure automated backups:
  ```bash
  # Add to root crontab on VPS
  0 3 * * * docker exec vps-postgres pg_dump -U postgres agent_dashboard | gzip > /opt/backups/db_$(date +\%Y\%m\%d).sql.gz
  # Keep 7 days
  0 4 * * * find /opt/backups -name "*.sql.gz" -mtime +7 -delete
  ```
  - [ ] Create `/opt/backups` directory
  - [ ] Test backup runs: `docker exec vps-postgres pg_dump -U postgres agent_dashboard | gzip > /opt/backups/test.sql.gz`
- [ ] Custom branding applied (if requested):
  - Company name in `app/layout.tsx` title
  - Logo file added
- [ ] n8n workflows set up (up to 2, as agreed):
  - Workflow 1:
  - Workflow 2:
- [ ] Stack update applied (pull latest, rebuild):
  ```bash
  cd /opt/agentplayground && git pull && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  ```

---

## Phase 4 — Delivery

- [ ] Compile credentials document (use encrypted channel — Bitwarden Send, ProtonMail, or Signal):
  ```
  === AgentPlayground Credentials ===
  
  Dashboard:   https://app.DOMAIN
  Email:       [client email]
  Password:    [generated password]
  
  n8n:         https://n8n.DOMAIN
  User:        admin
  Password:    [N8N_BASIC_AUTH_PASSWORD]
  
  FileBrowser: https://files.DOMAIN
  Portainer:   https://manage.DOMAIN
  
  Database password:  [POSTGRES_PASSWORD]
  (keep this safe — needed for manual DB access)
  ```
- [ ] Send credentials email (template: `email-templates.md`)
- [ ] Send onboarding guide (template varies by plan)
- [ ] Revoke our SSH access (ask client to change root password or remove our key)
- [ ] Log the delivery in your CRM/spreadsheet

---

## Phase 5 — Follow-up (Premium only)

- [ ] Day 1: Check-in email (did everything work? any questions?)
- [ ] Day 15: Mid-support check-in
- [ ] Day 30: End-of-support email + upsell monthly maintenance plan
