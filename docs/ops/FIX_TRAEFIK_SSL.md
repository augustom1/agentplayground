# Fix: Traefik SSL / 404 Not Found

## Current known state
- All containers running and healthy (including vps-dashboard)
- App responds correctly at `http://127.0.0.1:3000/api/health` inside the container
- `DOMAIN=agentplayground.net` is set in `.env`
- DNS A records exist: `@` and `*` → 95.217.163.247
- Problem: `https://app.agentplayground.net` shows 404 or SSL error

---

## Step 1 — Check if ports 80 and 443 are open

```bash
curl -I http://app.agentplayground.net
curl -Ik https://app.agentplayground.net
```

If these hang or time out → firewall is blocking. Fix:
```bash
ufw allow 80
ufw allow 443
ufw status
```

---

## Step 2 — Check Traefik sees the dashboard route

```bash
curl -s http://localhost:8080/api/http/routers/dashboard@docker | python3 -m json.tool
```

If it returns nothing or an error → Traefik API is not exposed. Check with:
```bash
docker logs vps-traefik 2>&1 | tail -30
```

Look for errors about the `proxy` network or missing routes.

---

## Step 3 — Check Traefik and dashboard are on the same network

```bash
docker network inspect traefik-proxy | grep -A3 "vps-dashboard\|vps-traefik"
```

Both `vps-traefik` and `vps-dashboard` must appear in this output.
If `vps-dashboard` is missing → the proxy network isn't attached. Fix:

```bash
docker network connect traefik-proxy vps-dashboard
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Step 4 — Check SSL cert was issued

```bash
docker exec vps-traefik cat /letsencrypt/acme.json 2>/dev/null | python3 -m json.tool | grep -A2 "agentplayground"
```

If empty or no entries → cert was never issued. Check:
```bash
docker logs vps-traefik 2>&1 | grep -i "acme\|certificate\|error"
```

Common reasons Let's Encrypt fails:
- Port 80 blocked by firewall (TLS challenge needs 443 reachable from internet)
- `ACME_EMAIL` not set in `.env`
- DNS not yet propagated

Check ACME_EMAIL is set:
```bash
grep ACME_EMAIL .env
```

If missing, add it:
```bash
echo "ACME_EMAIL=your@email.com" >> .env
```

---

## Step 5 — Test routing bypassing SSL

```bash
curl -vk https://127.0.0.1 -H "Host: app.agentplayground.net" 2>&1 | head -40
```

If you get HTML back → app works but cert is self-signed (Let's Encrypt hasn't issued yet).
If you get 404 → Traefik has no route for the dashboard.

---

## Step 6 — Full reset of Traefik (nuclear option)

If nothing above works, wipe the cert store and restart everything:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker volume rm vps_traefik-certs
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
docker logs -f vps-traefik
```

Watch the logs — you should see Traefik request a cert from Let's Encrypt within 30-60 seconds.

---

## Step 7 — Verify DNS from the VPS itself

```bash
curl -s https://dns.google/resolve?name=app.agentplayground.net&type=A | python3 -m json.tool
```

Should return `95.217.163.247`. If it returns a different IP → DNS is wrong in Cloudflare.

---

## Step 8 — Cloudflare proxy check

If Cloudflare is proxying the DNS (orange cloud), it can interfere with Let's Encrypt TLS challenge.

**In Cloudflare dashboard:**
- Go to DNS → check the A records for `@` and `*`
- Make sure they are **DNS only** (grey cloud), NOT proxied (orange cloud)
- Let's Encrypt needs a direct connection to the VPS

---

## Quick reference — useful commands

```bash
# Check all container status
docker compose ps

# Follow Traefik logs live
docker logs -f vps-traefik

# Check what networks a container is on
docker inspect vps-dashboard --format='{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'

# Manually test health endpoint
docker exec vps-dashboard wget -qO- http://127.0.0.1:3000/api/health

# Restart only the dashboard
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d dashboard
```
