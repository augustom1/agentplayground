# Prompt to build your app with Claude Code

Copy this into Claude Code from the root of an Agent Playground checkout, filling in the blanks.

---

Build a new Agent Playground app called **<APP NAME>** (slug: `<slug>`).

What it does: <one or two sentences — the user-facing feature>.

It should store: <list the fields you need, or "nothing — no database">.

Follow the App Template guide at `downloads/playground-app-template/README.md`. Specifically:

1. Create the page at `app/(app)/apps/<slug>/page.tsx` (client component, styled with the
   `var(--color-*)` tokens, no emojis, no `any`).
2. If it stores data, add a `model` to `prisma/schema.prisma` (additive/nullable only) and
   API routes at `app/api/<slug>/route.ts` (+ `[id]/route.ts` for update/delete). Every handler
   authenticates with `auth()` and scopes every query to `session.user.id`. Use `apiError` for errors.
3. If any part must be reachable without login, add the route under `app/<slug>/...` and add its
   prefix to `middleware.ts` `isPublic`.
4. Add a `STORE_APPS` entry to `lib/store-catalog.ts` so it shows in the Store.
5. Use the built-in **Redirect** app as the reference implementation.
6. Run `npm run build` and fix anything until it passes.

Keep it minimal and consistent with the existing code. Ask me before adding any new dependency.
