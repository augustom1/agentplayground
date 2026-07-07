# Agent Playground — App Template

This is a starter kit for building your own **app** for the Agent Playground platform.
Drop the pieces below into an Agent Playground checkout, build with Claude Code, and it
appears in the Store and inside playgrounds like the built-in apps.

An "app" is a small, self-contained feature: a page you can open, optionally backed by an
API route and a database table. The built-in **Redirect** app is the reference example —
read its files alongside this guide.

## What an app is made of

| Piece | Where it goes | Required? |
|---|---|---|
| A page | `app/(app)/apps/<slug>/page.tsx` | yes |
| An API route | `app/api/<slug>/route.ts` (+ `[id]/route.ts`) | only if it stores data |
| A data model | a `model` block in `prisma/schema.prisma` | only if it stores data |
| A public route | `app/<slug>/...` + add it to `middleware.ts` `isPublic` | only if it needs to be reachable without login |
| A Store listing | one entry in `lib/store-catalog.ts` (`STORE_APPS`) | to make it installable/visible |

## Rules so it fits the platform

- **Styling:** use the CSS variables (`var(--color-text)`, `var(--color-surface)`,
  `var(--color-brand)`, `var(--color-border)`, …). Don't hardcode colors. **No emojis in the UI.**
- **TypeScript:** no `any`.
- **Auth:** every API route starts with
  `const session = await auth(); if (!session?.user?.id) return apiError("Unauthorized", 401);`
  and always scopes queries to `session.user.id`.
- **Validation:** no Zod. Validate inputs manually (or with Valibot).
- **DB changes are additive:** new tables / nullable columns only — the platform runs
  `prisma db push` on start, so additive changes self-migrate.
- **Slugs:** every `[param]` at the same URL depth uses the same name.

## The reference app (Redirect)

Copy these files and adapt them:

- Page: `app/(app)/apps/redirect/page.tsx`
- API: `app/api/redirect-links/route.ts` and `app/api/redirect-links/[id]/route.ts`
- Public route: `app/r/[code]/route.ts` (+ the `/r/` line in `middleware.ts`)
- Model: `RedirectLink` in `prisma/schema.prisma`
- Store entry: the `redirect` object in `lib/store-catalog.ts`

## Build it with Claude Code

1. Open your Agent Playground checkout in Claude Code.
2. Paste the prompt in `CLAUDE-PROMPT.md` (in this folder), filling in your app's name and what it does.
3. Claude scaffolds the page/API/model, adds the Store entry, and verifies the build.
4. Run `npm run build` to confirm it compiles, then deploy.

## Manifest

`app.json` describes your app for the Store. Keep it in sync with your `STORE_APPS` entry.
