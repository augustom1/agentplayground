# Deploy Protocol — Agent Playground

> Read before every deploy. These checks take 2 minutes and prevent multi-hour outages.

---

## Pre-Deploy Checklist

### 1. Dynamic route slug audit (CRITICAL)
**Rule:** Every `[slug]` at the same URL level must use the SAME name.

Next.js App Router will silently build but crash at runtime with:
```
You cannot use different slug names for the same dynamic path ('id' !== 'teamId')
```

Before adding a new API route, check what slug name already exists at that level:

```bash
# Check slugs under a path
find app/api/playground/teams -type d -name '\[*\]'
```

If existing routes use `[id]`, your new route must also use `[id]` — not `[teamId]`, `[playgroundId]`, etc.

**Known slug names by path level:**
| Path | Slug |
|---|---|
| `app/api/playground/teams/[?]` | `[id]` |
| `app/api/playground/teams/[id]/threads/[?]` | `[threadId]` |
| `app/api/playground/teams/[id]/members/[?]` | `[agentId]` |
| `app/(app)/playground/[?]` | `[teamId]` (page route — different URL prefix) |
| `app/api/teams/[?]`, `app/api/agents/[?]`, etc. | `[id]` |

### 2. Local build check
```bash
npm run build
```
Any route conflict or TypeScript error shows here before it hits production. Only skip this if the change is a single-file copy of a trivially simple file (e.g., a static config).

### 3. Verify files to scp match what changed
```bash
git diff --name-only HEAD~1
```
Copy every changed file. Missing one file is a common cause of subtle breakage.

---

## Deploy Commands

```bash
# 1. SCP changed files (examples)
scp -i ~/.ssh/id_ed25519 <local-file> root@95.217.163.247:/root/opt/vps/<path>

# 2. For new directories, create them first
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 "mkdir -p /root/opt/vps/<new-dir>"

# 3. Standard rebuild (uses Docker layer cache — fast, fine for most changes)
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"

# 4. Check health
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 "docker inspect vps-dashboard --format='{{.State.Health.Status}}'"
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 "docker logs vps-dashboard --tail=20 2>&1"
```

---

## When to Use --no-cache Rebuild

Use `--no-cache` when:
- You **deleted or renamed a directory** (Docker's `COPY . .` layer caches the old structure)
- You get a runtime error that shouldn't exist given the current source files
- A regular `--build` didn't pick up your changes

```bash
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache dashboard && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d dashboard"
```

This takes ~4-6 minutes instead of ~1 minute.

---

## Post-Deploy Verification

```bash
# 1. Health status (should be "healthy" within ~30s)
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "docker inspect vps-dashboard --format='{{.State.Health.Status}}'"

# 2. No unhandledRejection errors in logs
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "docker logs vps-dashboard --tail=30 2>&1"

# 3. Hit the health endpoint
curl -s https://app.agentplayground.net/api/health
```

If `unhandledRejection` appears in logs repeatedly, the app is broken even if `docker ps` shows "Up".

---

## Schema Changes

If `prisma/schema.prisma` was modified:

```bash
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose exec dashboard npx prisma db push"
```

The entrypoint.sh also runs `prisma db push` on startup — but this only works if the schema file was scp'd before the container started.

---

## Rollback

If the deploy breaks the app and you can't quickly fix it:

```bash
# Option A: Restore a single file from git history
git show HEAD~1:app/api/some/route.ts > /tmp/old-route.ts
scp -i ~/.ssh/id_ed25519 /tmp/old-route.ts root@95.217.163.247:/root/opt/vps/app/api/some/route.ts
# Then rebuild

# Option B: Roll back to previous image (if not pruned)
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "docker images vps-dashboard --format '{{.ID}} {{.CreatedAt}}'"
# docker tag <old-id> vps-dashboard:rollback && docker compose up -d
```

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `You cannot use different slug names for the same dynamic path` | Two `[slug]` dirs at same level with different names | Rename new route to match existing slug; no-cache rebuild |
| Container `unhealthy` but no error in logs | Health check timing | Wait 60s, re-check. If still unhealthy, check `/api/health` directly |
| Changes not reflected after `--build` | Docker layer cache reused old `COPY . .` | Use `--no-cache` rebuild |
| Prisma error on startup | Schema out of sync with DB | Run `prisma db push` inside container |
| `MODULE_NOT_FOUND` in logs | File not scp'd, or import path wrong | Check `git diff --name-only` and rescp missing files |
