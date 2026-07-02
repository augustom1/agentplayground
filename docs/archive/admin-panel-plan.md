# Admin Panel — Agent Playground Implementation Plan

## Overview

Add a `/admin` route to Agent Playground with two primary tabs:
1. **Analytics** — page-level traffic, behavior, and performance stats (self-hosted, no third-party trackers)
2. **API Monitor** — unified control panel for all API connections: Claude mobile (claude.ai), external apps via API key, and agent API clients

The admin panel is gated behind an `admin` role check on the NextAuth session. All data is stored in PostgreSQL using Prisma.

---

## Part 1: Analytics Tab

### 1.1 — Data Collection Middleware

Create `middleware/analytics.ts` (or integrate into the existing Next.js middleware).

**Collect on every page request and API route hit:**

```ts
interface PageView {
  id: string
  path: string              // e.g. "/playground/abc123"
  referrer: string | null
  userAgent: string
  ip: string                // anonymize: store only first 3 octets for IPv4
  country: string | null    // from CF-IPCountry header or geoip-lite
  deviceType: 'desktop' | 'mobile' | 'tablet'
  browser: string
  os: string
  sessionId: string         // random UUID stored in a first-party cookie
  userId: string | null     // from NextAuth session if logged in
  durationMs: number | null // filled in on session end via beacon
  createdAt: DateTime
}
```

Use `ua-parser-js` (already common in Next.js stacks) for device/browser/OS parsing.
Use the `CF-IPCountry` Cloudflare header if behind Cloudflare, or `geoip-lite` npm package otherwise.

**Client-side beacon script** — inject a small `<script>` tag in the root layout that:
- Sends a `POST /api/admin/analytics/event` on page load with `{ type: 'pageview', path, referrer, sessionId }`
- Sends a `POST /api/admin/analytics/event` on `visibilitychange` (tab close) with `{ type: 'duration', durationMs }`
- Tracks scroll depth milestones (25%, 50%, 75%, 100%) as custom events
- Tracks click events on elements with `data-track` attribute

**Custom event shape:**
```ts
interface AnalyticsEvent {
  id: string
  sessionId: string
  userId: string | null
  type: string              // 'pageview' | 'duration' | 'scroll_depth' | 'click' | 'error' | custom
  path: string
  properties: Json          // arbitrary key-value bag
  createdAt: DateTime
}
```

### 1.2 — Prisma Schema additions

```prisma
model PageView {
  id          String   @id @default(cuid())
  path        String
  referrer    String?
  userAgent   String?
  ip          String?
  country     String?
  deviceType  String?
  browser     String?
  os          String?
  sessionId   String
  userId      String?
  durationMs  Int?
  createdAt   DateTime @default(now())

  @@index([path])
  @@index([sessionId])
  @@index([createdAt])
  @@index([userId])
}

model AnalyticsEvent {
  id          String   @id @default(cuid())
  sessionId   String
  userId      String?
  type        String
  path        String
  properties  Json     @default("{}")
  createdAt   DateTime @default(now())

  @@index([type])
  @@index([path])
  @@index([createdAt])
}
```

### 1.3 — API Routes for Analytics Data

Create `app/api/admin/analytics/` with these endpoints (all protected by admin role check):

- `GET /api/admin/analytics/overview?from=&to=` — returns:
  - total pageviews, unique sessions, unique users
  - avg session duration
  - bounce rate (sessions with only 1 pageview)
  - top 10 pages by views
  - top 5 referrers
  - device breakdown (desktop/mobile/tablet %)
  - browser breakdown
  - country breakdown
  - hourly/daily pageview timeseries for chart

- `GET /api/admin/analytics/page?path=&from=&to=` — per-page drill-down:
  - views, unique visitors, avg duration, scroll depth distribution

- `GET /api/admin/analytics/events?type=&from=&to=` — event stream with filters

- `POST /api/admin/analytics/event` — public (no auth) endpoint that receives beacon pings from the client script. Rate-limit with Redis (100 req/min per IP). Validate with Valibot.

### 1.4 — Analytics UI Components

**Route:** `app/admin/analytics/page.tsx`

**Components to build:**

```
AdminLayout (sidebar with tabs: Analytics | API Monitor)
└── AnalyticsTab
    ├── DateRangePicker (presets: Today, 7d, 30d, 90d, custom)
    ├── MetricCards row
    │   ├── TotalPageviews
    │   ├── UniqueSessions
    │   ├── AvgDuration
    │   └── BounceRate
    ├── TimeseriesChart (line chart, recharts or native SVG)
    ├── TopPagesTable (path | views | uniques | avg duration)
    ├── ReferrersTable
    ├── DeviceDonutChart
    ├── CountryBarChart (top 10)
    └── RealtimeIndicator (polls /api/admin/analytics/overview?realtime=true every 30s)
```

All data fetching via `useSWR` with the date range as the cache key. Add a manual "Refresh" button.

---

## Part 2: API Monitor Tab

### 2.1 — API Key & Connection Model

Extend the database to track every API consumer:

```prisma
model ApiClient {
  id          String       @id @default(cuid())
  name        String                        // human label, e.g. "Claude Mobile", "n8n Agent"
  type        ApiClientType                 // CLAUDE_MOBILE | EXTERNAL_APP | AGENT | WEBHOOK
  apiKey      String       @unique          // hashed with bcrypt before storing; shown once on creation
  apiKeyPrefix String                       // first 8 chars, shown in UI for identification
  isActive    Boolean      @default(true)
  rateLimit   Int          @default(100)    // req/min
  permissions Json         @default("[]")  // list of allowed scopes
  lastSeenAt  DateTime?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  requests    ApiRequest[]
}

enum ApiClientType {
  CLAUDE_MOBILE
  EXTERNAL_APP
  AGENT
  WEBHOOK
}

model ApiRequest {
  id           String    @id @default(cuid())
  clientId     String
  client       ApiClient @relation(fields: [clientId], references: [id])
  method       String    // GET | POST | etc.
  path         String
  statusCode   Int
  durationMs   Int
  requestSize  Int?      // bytes
  responseSize Int?      // bytes
  errorMessage String?
  createdAt    DateTime  @default(now())

  @@index([clientId])
  @@index([createdAt])
  @@index([statusCode])
}
```

### 2.2 — API Request Logging Middleware

Create `lib/api-logger.ts` — a wrapper used in all API route handlers:

```ts
// Usage in any API route:
export const POST = withApiLogger(async (req, ctx) => {
  // handler logic
})
```

`withApiLogger` wraps the handler to:
1. Extract `Authorization: Bearer <key>` header
2. Look up `ApiClient` by key prefix → validate hash
3. Check `isActive` and rate limit (Redis sliding window counter)
4. Log start time
5. Call the inner handler
6. Record `ApiRequest` row with status code, duration, sizes
7. Update `ApiClient.lastSeenAt`

Also create a standalone middleware version for Next.js middleware edge runtime if needed.

### 2.3 — API Monitor UI

**Route:** `app/admin/api-monitor/page.tsx`

**Components:**

```
ApiMonitorTab
├── ClientList (left panel or top section)
│   ├── ClientCard (per ApiClient)
│   │   ├── name + type badge (CLAUDE_MOBILE / AGENT / etc.)
│   │   ├── status dot (active/inactive, last seen)
│   │   ├── req count last 24h
│   │   └── actions: Enable/Disable, Rotate Key, Delete, Edit
│   └── "+ Add API Client" button → modal
│
├── ClientDetail (right panel, shown when a client is selected)
│   ├── TimeseriesChart — requests/min for this client
│   ├── StatusCodeBreakdown (2xx green / 4xx yellow / 5xx red)
│   ├── AvgLatencyGauge
│   ├── TopEndpointsTable (path | count | p50 | p95 | errors)
│   ├── ErrorLogTable (recent errors with path, message, timestamp)
│   └── RateLimitBar (current usage vs limit)
│
└── GlobalMetrics (top bar, all clients combined)
    ├── Total req/24h
    ├── Error rate %
    ├── Avg latency ms
    └── Active clients count
```

**Add Client Modal fields:**
- Name (text)
- Type (select: Claude Mobile / External App / Agent / Webhook)
- Rate limit (number, req/min)
- Permissions (multi-select checkboxes for scopes)
- On submit: generate API key, show it ONCE in a copy-to-clipboard dialog, store only the hash

### 2.4 — API Routes for Monitor Data

Under `app/api/admin/api-monitor/`:

- `GET /api/admin/api-monitor/clients` — list all ApiClients (no raw keys)
- `POST /api/admin/api-monitor/clients` — create new client, returns plaintext key once
- `PATCH /api/admin/api-monitor/clients/[id]` — update name, rateLimit, permissions, isActive
- `DELETE /api/admin/api-monitor/clients/[id]` — soft delete (set isActive=false) or hard delete
- `POST /api/admin/api-monitor/clients/[id]/rotate` — generate new key, invalidate old one
- `GET /api/admin/api-monitor/clients/[id]/stats?from=&to=` — timeseries + status breakdown + top endpoints + recent errors
- `GET /api/admin/api-monitor/global?from=&to=` — aggregated stats across all clients

---

## Part 3: Admin Layout & Access Control

### 3.1 — Route Protection

Create `app/admin/layout.tsx`:

```ts
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/') 
  }
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main>{children}</main>
    </div>
  )
}
```

Make sure the `User` model in Prisma has a `role` field (`String @default("user")`). Set admin users via a seed script or direct DB update.

### 3.2 — Sidebar Navigation

```
/admin                → redirects to /admin/analytics
/admin/analytics      → Analytics tab
/admin/api-monitor    → API Monitor tab
```

Future tabs (stub the routes now, content later):
- `/admin/users` — user management
- `/admin/agents` — agent run history/logs
- `/admin/system` — server health, Redis stats, Ollama model status

---

## Part 4: Implementation Order for Claude Code

Execute in this sequence to avoid broken states:

1. **Prisma migrations** — add `PageView`, `AnalyticsEvent`, `ApiClient`, `ApiRequest` models; add `role` to `User`
2. **Analytics collection** — `POST /api/admin/analytics/event` route + client beacon script in root layout
3. **Analytics query routes** — `GET /api/admin/analytics/overview` and `/page`
4. **API logger middleware** — `withApiLogger` wrapper; apply to at least one existing route as proof of concept
5. **API monitor routes** — CRUD for `ApiClient`, stats endpoint
6. **Admin layout + route protection**
7. **Analytics UI**
8. **API Monitor UI**
9. **Wire up realtime polling** (SWR refresh intervals)
10. **Rate limiting** — Redis sliding window on the beacon and API routes

---

## Part 5: Dependencies to Install

```bash
# Already likely present: prisma, @prisma/client, redis, next-auth, valibot

npm install ua-parser-js geoip-lite bcryptjs
npm install -D @types/ua-parser-js @types/geoip-lite @types/bcryptjs

# For charts in the UI (pick one):
npm install recharts        # if not already present
```

Do NOT install Zod. Use Valibot for all new input validation, consistent with the existing stack.

---

## Part 6: Key Constraints & Notes

- **No third-party analytics services** — everything self-hosted in existing PostgreSQL
- **No Zod** — use Valibot throughout
- **No Docker build breaks** — new env vars must have defaults; new Prisma models need migrations not manual edits
- **IP anonymization** — store only the first 3 octets of IPv4 (`192.168.1.x`) for GDPR friendliness
- **API keys** — never store plaintext; hash with bcrypt rounds=10; only show once at creation
- **Admin role** — check `session.user.role === 'admin'` in both layout (redirect) and every `/api/admin/*` route (return 403)
- **Laptop mode compatibility** — the beacon `POST` route and `ApiRequest` logging must degrade gracefully if Redis is not configured (skip rate limiting, log a warning)

---

## Summary of New Files

```
app/
  admin/
    layout.tsx                         # auth guard + sidebar
    analytics/page.tsx                 # analytics tab UI
    api-monitor/page.tsx               # api monitor tab UI
  api/
    admin/
      analytics/
        event/route.ts                 # public beacon receiver
        overview/route.ts              # aggregated stats
        page/route.ts                  # per-page drill-down
      api-monitor/
        clients/route.ts               # list + create
        clients/[id]/route.ts          # update + delete
        clients/[id]/rotate/route.ts   # key rotation
        clients/[id]/stats/route.ts    # per-client metrics
        global/route.ts                # global metrics

lib/
  api-logger.ts                        # withApiLogger HOF
  analytics-beacon.ts                  # client-side beacon (loaded in layout)
  geoip.ts                             # geoip-lite wrapper

components/
  admin/
    AdminSidebar.tsx
    analytics/
      MetricCards.tsx
      TimeseriesChart.tsx
      TopPagesTable.tsx
      DeviceDonutChart.tsx
    api-monitor/
      ClientList.tsx
      ClientDetail.tsx
      AddClientModal.tsx
      GlobalMetrics.tsx

prisma/
  migrations/YYYYMMDD_admin_panel/     # generated by prisma migrate dev
```
