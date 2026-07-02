# Client Version — Extractable Modules

This document identifies platform modules that can be extracted and reused for the client-facing SaaS product.

## Reusable Modules

### Tier 1 — Core (extract as-is)

| Module | Files | What it provides |
|--------|-------|-----------------|
| **Chat Engine** | `lib/chat-tools.ts`, `app/api/chat/route.ts` | Claude tool-use integration, conversational agent building |
| **Permission System** | `lib/agent-permissions.ts` | Scoped access control for multi-tenant environments |
| **DB Access Layer** | `lib/db-agent.ts`, `lib/prisma.ts` | Centralized, permission-aware database access |
| **Widget System** | `app/dashboard/page.tsx` | Customizable dashboard with localStorage/DB persistence |
| **Calendar** | `app/schedule/page.tsx` | Monthly calendar with expandable tasks |

### Tier 2 — Adapt per client

| Module | Adaptation needed |
|--------|------------------|
| **Agent Lab** | Scope to client's teams only |
| **Skills Registry** | Filter to client's permitted skills |
| **Import/Export** | Add marketplace/registry browser |
| **Settings** | Add billing, plan management, API key management |

### Tier 3 — Client-only (build new)

| Module | Purpose |
|--------|---------|
| **Auth** | NextAuth/Clerk for login, registration, workspace isolation |
| **Billing** | Stripe/MercadoPago integration |
| **Onboarding** | Guided setup wizard |
| **Usage Limits** | Rate limiting, token tracking per plan |
| **White-labeling** | Custom branding, domain per workspace |

## Extraction Strategy

1. Keep the personal version as the "admin" edition
2. Fork the repo for the client version
3. Add auth layer wrapping all API routes
4. Scope all queries by `workspaceId` (add to every table)
5. Add billing webhook endpoints
6. Replace localStorage widget storage with DB-backed (already have the `/api/widgets` route)

## Shared Components (keep in sync)

These components should stay identical across both versions:
- `components/Sidebar.tsx` (nav structure)
- `lib/chat-tools.ts` (tool definitions)
- `lib/agent-permissions.ts` (permission system)
- `prisma/schema.prisma` (schema, with `workspaceId` added for client version)
