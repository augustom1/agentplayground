# Code Conventions & Patterns

> Non-negotiable rules and standard patterns for every dev agent.
> These are hard constraints — don't deviate without explicit user approval.

---

## Hard Rules

| Rule | Why |
|---|---|
| No `any` in TypeScript | Breaks type safety — use `unknown` and narrow |
| No Zod | Project uses Valibot for validation |
| No secrets in docker-compose.yml | Security — use `.env.local` only |
| No `git pull` on VPS | Broken — always use `scp` to deploy |
| Never remove `output: 'standalone'` | Docker build breaks without it |
| Deleting directories → rebuild with `--no-cache` | Docker cache will use stale layers |
| Slug names must match at same URL depth | e.g. `app/api/playground/teams/[id]/` — all nested routes use `[id]` |
| Always use `select` in Prisma queries | Never expose `passwordHash` or full rows |
| No new major deps without tradeoff explanation | Keeps bundle size and surface area manageable |

---

## API Route Pattern

Every API route follows this exact structure:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // 1. Auth check — always first
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  // 2. Role check if needed
  // if ((session.user as { role?: string }).role !== "admin") return apiError("Forbidden", 403);

  // 3. Prisma query — always with select
  const data = await prisma.team.findMany({
    select: { id: true, name: true, description: true },
  });

  // 4. Return JSON
  return NextResponse.json(data);
}
```

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `agent-runner.ts`, `chat-tools.ts` |
| React components | PascalCase | `AgentCard.tsx`, `TeamList.tsx` |
| API routes | `route.ts` in folder | `app/api/teams/[id]/route.ts` |
| Prisma models | PascalCase singular | `Team`, `AgentMemory` |
| DB fields | camelCase | `createdAt`, `systemPrompt` |
| Env vars | SCREAMING_SNAKE | `AUTH_SECRET`, `DATABASE_URL` |
| URL params | `[id]` (same name at same depth) | `app/api/teams/[id]/agents/[id]` ← wrong; use `[agentId]` nested |

Wait — slug rule clarification: params at the **same URL depth level** must be named consistently. At different depths they can differ. E.g.: `app/api/teams/[id]/` is fine, `app/api/playground/teams/[id]/` separately is fine. But within one folder tree, the name at that position must not change across siblings.

---

## React Component Conventions

```typescript
// Server Component (default — no "use client")
export default async function TeamPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) redirect("/login");
  // ... fetch data server-side
}

// Client Component (only when needed — interactivity, hooks, browser APIs)
"use client";
import { useState } from "react";
export function TeamCard({ team }: { team: Team }) { ... }
```

- Never put `"use client"` on a page unless the entire page needs client-side state
- Extract the interactive part into a child Client Component instead
- Server Components fetch data directly; Client Components receive it as props

---

## Tailwind Patterns

```typescript
import { cn } from "@/lib/utils";

// Conditional classes
<div className={cn("base-class", isActive && "active-class", variant === "danger" && "text-red-400")} />

// Card pattern
<div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4" />

// Status colors
const statusColor = {
  healthy: "text-green-400",
  idle: "text-yellow-400",
  error: "text-red-400",
  deploying: "text-blue-400",
}[status];
```

---

## Error Handling

Use `apiError` from `lib/api-error.ts` for all API route errors:

```typescript
return apiError("Not found", 404);
return apiError("Unauthorized", 401);
return apiError("Invalid input", 400);
```

For client-side, catch errors and display with toast or inline error state — never `console.error` only.

---

## Streaming Chat Pattern

```typescript
// In app/api/chat/route.ts — streaming response
const stream = await anthropic.messages.stream({ ... });
const encoder = new TextEncoder();
return new Response(
  new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        // handle text delta, tool use, etc.
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.close();
    }
  }),
  { headers: { "Content-Type": "text/event-stream" } }
);
```

---

## Brain Ingestion Pattern

When agents write research or task results to Brain:

```typescript
import { ingestToBrain } from "@/lib/brain/ingest";

await ingestToBrain({
  content: markdownContent,
  title: "Research: [Topic]",
  source: "research:[topic-slug]",   // or "task-result:[taskId]", "client:[name]", etc.
  sourceType: "research",            // or "task-result", "manual", "session-report"
  metadata: { taskId, agentName, timestamp: new Date().toISOString() },
});
```

Source naming conventions:
- `docs:[filepath]` — indexed documentation
- `research:[topic]` — web search / research results
- `task-result:[taskId]` — completed agent task
- `client:[name]` — client brief/info
- `session-report:[date]` — session summary
- `content:draft:[slug]` — blog draft
- `protocol:[name]` — automation protocol

---

## Deploy Checklist (Before Any Deploy)

1. `npx prisma generate` if schema changed
2. `npx tsc --noEmit` to check types
3. `scp` changed files to VPS
4. If schema changed: `docker compose exec dashboard npx prisma db push`
5. If directories deleted: `--no-cache` rebuild
6. Standard restart: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard`
7. `docker logs dashboard --tail 50` to verify startup
