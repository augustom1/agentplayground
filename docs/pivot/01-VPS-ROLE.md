# VPS Role Reassignment + Cleanup

> Session: Pivot-A  
> Estimated time: 1 session  
> Pre-req: SensorGuard branch cleaned and merged first

---

## New Role: The Hub

The VPS app (`app.agentplayground.net`) evolves from "your personal coordinator" into the **hub that everything connects to**:

1. **Your personal coordinator** (unchanged) — all your agents, brain, plans
2. **Paid client backend** — desktop apps of VPS-plan clients point here (or to their own VPS)
3. **Download + license backend** — version info, license key validation, download tracking
4. **App update server** — base app polls `/api/version` to check for updates

---

## What to Remove from VPS App

These pages exist as personal tools but should not be part of any client-facing version. Remove from production navigation and mark as admin-only or remove entirely:

| Page | Action | Reason |
|---|---|---|
| `/cv` | Remove from nav, keep page as admin-only | Personal, not client use case |
| `/learn` | Remove from nav, archive to Brain | Personal |
| `/notes` | Remove from nav, fold into Brain | Duplicates Brain functionality |
| `/connect` | Remove entirely | Was a placeholder, never used |
| `/executor` | Keep — internal tool but useful | Agent task executor |
| `/overview` | Keep as system overview | Useful for admin |
| `/stack` | Keep in admin section | Dev tool |

**Implementation:** Add a `PERSONAL_PAGES` constant and conditionally hide nav items based on `session.user.role === 'admin'`. Pages stay in the codebase so they work for you, but are invisible to any other user role.

---

## What to Add to VPS App

### A. Version + Download Endpoint
```typescript
// app/api/version/route.ts
GET /api/version
→ { version: "0.3.0", downloadUrl: "...", changelog: "..." }
```
- Returns current base app version
- Desktop apps poll this on startup to show "Update available"
- No auth required (public endpoint)

### B. Desktop App Auth
Desktop app users on VPS plan authenticate against the VPS:
```typescript
// app/api/app/connect/route.ts
POST /api/app/connect  { licenseKey, deviceId }
→ { token: JWT, userId, plan: "vps-hosted" }
```
- Generates a long-lived JWT for the desktop app
- Desktop app stores this in local config and uses it for all requests
- VPS app validates it on every request like a normal session

### C. License Validation (lightweight)
```typescript
// app/api/app/validate/route.ts
POST /api/app/validate  { licenseKey }
→ { valid: true, plan: "custom-build", expiresAt: "..." }
```
- Simple lookup against a `License` table (licenseKey, userId, plan, expiresAt)
- No Stripe yet — manual row insertion via Admin panel for now
- Later: auto-created on Stripe checkout

### D. License Admin UI
```typescript
// app/admin/licenses/page.tsx
```
- List all licenses, create/revoke
- Fields: key (generated UUID), plan, userEmail, expiresAt, deviceId
- Simple CRUD — 1 table, 1 admin page

---

## Schema Changes (VPS)

```prisma
model License {
  id         String   @id @default(cuid())
  key        String   @unique
  plan       String   // "vps-hosted" | "custom-build" | "pro"
  userEmail  String
  expiresAt  DateTime?
  deviceId   String?  // locked to device after first use
  createdAt  DateTime @default(now())
}
```

---

## Navigation Cleanup

Update the main sidebar nav to group pages:

**Coordinator group** (all users): Home, Chat, Teams, Brain, Plans, Schedule, Actions  
**Work tools** (all users): Playground, Projects, Files  
**Settings** (all users): Settings, Billing  
**Admin only**: Admin, Overview, Stack, CV, Learn, Notes  

The admin group is hidden unless `session.user.role === 'admin'`. This makes the app clean for any future user who creates an account on the VPS.

---

## Deploy Steps for This Session

1. Add `License` model to schema → `npx prisma db push`
2. Create `app/api/version/route.ts` and `app/api/app/connect/route.ts`
3. Create `app/admin/licenses/page.tsx`
4. Update sidebar nav to hide personal pages from non-admin
5. `scp` + rebuild container
6. Verify: non-admin user cannot see /cv, /learn, /notes in nav

---

## Files to Touch

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add License model |
| `app/api/version/route.ts` | New — public version endpoint |
| `app/api/app/connect/route.ts` | New — desktop app auth |
| `app/api/app/validate/route.ts` | New — license check |
| `app/admin/licenses/page.tsx` | New — license CRUD |
| `components/layout/Sidebar.tsx` (or wherever nav lives) | Hide personal pages from non-admin |
