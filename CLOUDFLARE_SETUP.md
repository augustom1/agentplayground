# Cloudflare Setup — Connect Your Domain to Your VPS

Follow these steps in order. Takes about 10-15 minutes total.

---

## Step 1 — Create a Cloudflare Account

1. Go to **cloudflare.com**
2. Click **Sign Up**
3. Enter your email and create a password
4. Verify your email

---

## Step 2 — Add Your Domain to Cloudflare

1. After logging in, click **Add a domain** (or **+ Add site**)
2. Enter your domain (e.g. `agentplayground.net`) → click **Continue**
3. Select the **Free plan** → click **Continue**
4. Cloudflare will scan your existing DNS records — just click **Continue** (you'll replace them anyway)

---

## Step 3 — Change Nameservers at Your Registrar

Cloudflare will give you **two nameservers** that look like:
```
amelia.ns.cloudflare.com
brad.ns.cloudflare.com
```
(yours will be different — use what Cloudflare shows you)

You need to set these at wherever you bought your domain:

**If you bought at Namecheap:**
1. Log in → Domain List → Manage your domain
2. Nameservers section → switch to **Custom DNS**
3. Paste both Cloudflare nameservers → Save

**If you bought at GoDaddy:**
1. Log in → My Products → DNS → Manage
2. Scroll to Nameservers → click **Change**
3. Switch to **Custom** → paste both Cloudflare nameservers → Save

**If you bought at Google Domains / Squarespace:**
1. Manage domain → DNS → Name servers
2. Switch to **Custom** → paste both → Save

> Nameserver changes can take 5 minutes to 24 hours to propagate. Usually under 30 min.

---

## Step 4 — Add DNS Records in Cloudflare (Point to Your VPS)

Once your domain is active in Cloudflare:

1. Go to your domain → **DNS** → **Records** → **Add record**

Add these **two records**:

| Type | Name | IPv4 address | Proxy status | TTL |
|------|------|-------------|--------------|-----|
| A | `@` | `YOUR_VPS_IP` | **DNS only** (grey cloud) | Auto |
| A | `*` | `YOUR_VPS_IP` | **DNS only** (grey cloud) | Auto |

> Replace `YOUR_VPS_IP` with the IP shown in your Hetzner dashboard.

> `@` = root domain (agentplayground.net)
> `*` = wildcard (covers app., n8n., files., manage., etc.)

**IMPORTANT — Keep proxy set to "DNS only" (grey cloud, NOT orange)**
Your app uses Traefik for SSL certificates. If you enable Cloudflare proxy (orange cloud),
you get double-SSL and your site will show certificate errors.

---

## Step 5 — SSL/TLS Settings in Cloudflare

1. Go to your domain → **SSL/TLS** tab
2. Set mode to **Full** (not Full Strict, not Flexible)

This tells Cloudflare to allow HTTPS to your server even though the proxy is off.
Traefik handles the actual certificate via Let's Encrypt automatically.

---

## Step 6 — Verify Everything Is Working

After your VPS is running and setup.sh has finished:

1. Open your browser and go to `https://app.YOURDOMAIN.com`
2. You should see the Agent Dashboard login screen
3. Check each subdomain:
   - `https://app.YOURDOMAIN.com` — Agent Dashboard
   - `https://n8n.YOURDOMAIN.com` — n8n Automation
   - `https://files.YOURDOMAIN.com` — FileBrowser
   - `https://manage.YOURDOMAIN.com` — Portainer

---

## Troubleshooting

**Site not loading after DNS change:**
- DNS propagation can take up to 24h — wait and retry
- Run `nslookup YOURDOMAIN.com` in terminal — should return your VPS IP

**SSL certificate error:**
- Make sure Cloudflare proxy is OFF (grey cloud, not orange)
- Make sure Traefik has time to get certificates (1-2 min after first request)
- Check logs: `docker logs vps-traefik`

**Wildcard subdomain not working:**
- Confirm the `*` A record is added in Cloudflare DNS
- Confirm your registrar nameservers are pointing to Cloudflare (not the old ones)

---

## Optional — Security Extras (do after everything works)

- **Cloudflare → Security → Bot Fight Mode** → Turn ON (blocks bots for free)
- **Cloudflare → Speed → Auto Minify** → Check JS, CSS, HTML
- **Cloudflare → Security → DDoS** → Already on by default on free plan
- **Firewall rules** (Hetzner side): Add this after going live — allows only ports 22 (your IP), 80, 443
