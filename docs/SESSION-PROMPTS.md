# docs/SESSION-PROMPTS.md — UI v4 Prompt Schedule
> Created 2026-07-04, updated same day (Overview schedule, per-playground schedules, Projects, light mode, pixel logo).
> One prompt per session — paste it as the first message of a fresh Claude Code session.
> Full spec behind every prompt: `docs/PLAN.md` §1. Do the sessions in order; each ends with a passing Docker build.
> Mark a session done here (change 🔜 to ✅ + date) when it ships.

---

## ✅ Session 33 — Shell + home screen + theme (done 2026-07-04)

```
Session 33 — UI v4 shell. Read HANDOFF.md, docs/VISION.md §2 update banner, and docs/PLAN.md §1 first.

Build the new app shell:
1. Sidebar rebuilt on the Claude Desktop pattern: top tab pill with exactly three tabs — Chat | Playgrounds | Overview.
   - Chat tab: New chat, Projects (stub link until Session 37), Recents, chat-with picker (Playground Keeper or team heads), Brain item linking to the Brain window in the Overview tab.
   - Playgrounds tab: coordinator quick chat entry (stub, built in Session 34) + playground list.
   - Overview tab: link to /overview (hub rebuilt in Session 34).
2. Home screen: centered greeting + large coordinator input (Claude Desktop "What's on your plate today?" feel), playground quick actions below.
3. MobileNav: same three tabs (replace the temporary /overview patch).
4. Purge the 9 hardcoded rust #D4715A occurrences in app/components → --color-brand tokens. Don't touch existing dark tokens in app/globals.css.
5. Light mode: add a parallel white/grey token set with the same blue accent (darker blue where contrast on white needs it) + a theme toggle in Settings. Dark stays default.
6. Verify the new pixel-art logo (chosen 2026-07-04) is wired everywhere — components/Logo.tsx, app sidebar, marketing homepage, PWA icons. The rust asterisk must not appear anywhere.
7. Centering pass on all main content areas.
Rules: Claude Desktop feel, remove rather than add, no emojis in UI. Finish with npm run build + docker compose build passing, deploy via scp, update HANDOFF.md.
```

## 🔜 Session 34 — Overview hub + coordinator router

```
Session 34 — UI v4 Overview hub + coordinator task router. Read HANDOFF.md and docs/PLAN.md §1 first.

1. Overview tab rebuilt as the system hub:
   - Widget dashboard (static layout this session): widgets for playgrounds, teams, total/active tasks, plans, recent completions.
   - Full Brain window (all docs — browse, search, add). The Chat tab's Brain item lands here.
   - Global Schedule window: everything scheduled across all playgrounds (meetings, scheduled tasks, cron/overnight runs).
   - Sections for previously-cut utilities: Optimize, websites, tools/agent-lab. Confirm the exact list with me before building.
2. Playgrounds tab coordinator quick chat (the task router):
   - I describe a task → coordinator picks the relevant team → confirmation popup shows its pick + reasoning → I accept, or override via a playground → team picker → task dispatches through existing delegate_to_team / plans machinery.
Rules: no emojis, remove rather than add. Finish with passing builds, deploy via scp, update HANDOFF.md.
```

## 🔜 Session 35 — Customizable dashboards + menus

```
Session 35 — UI v4 customizable dashboards. Read HANDOFF.md and docs/PLAN.md §1 first.

1. Formalize the widget registry: add/remove/reorder widgets, layout persisted — per-user for the Overview tab dashboard, per-playground for playground dashboards.
2. Playground inner left menu (WORKSPACE items) becomes customizable: add/remove/reorder entries, persisted per playground. Schedule is a standard menu item — scoped to that playground only (same scoping pattern as Brain/brainTags).
3. Schema: layout JSON on Playground + user-level dashboard config (prisma db push on VPS as part of deploy).
Rules: no emojis, keep the Claude Desktop feel. Finish with passing builds, deploy via scp (schema push first), update HANDOFF.md.
```

## 🔜 Session 36 — Team drill-down + per-agent editor

```
Session 36 — UI v4 agent editor. Read HANDOFF.md and docs/PLAN.md §1 first.

1. Team drill-down inside a playground (/playground/[id] → team → agents): click a team, see its agents in detail.
2. Per-agent editor: LLM provider/model, permitted skills (allowlist), Brain doc access (grant/revoke specific docs), file access/permissions. All interactive.
3. Schema: per-agent capability records — skills allowlist + doc ACL join table. Design these as the same records the future permission-rings layer (PLAN §5) will enforce, not UI-only state.
Rules: no emojis. Finish with passing builds, schema push + deploy via scp, update HANDOFF.md.
```

## 🔜 Session 37 — Projects: model + isolated workspace

```
Session 37 — UI v4 Projects (part 1: isolation). Read HANDOFF.md and docs/PLAN.md §1 (item 6) first.

Projects = isolated, disposable workspaces spanning multiple playgrounds (example: SensorGuard — its leftover cleanup once took a whole session; the design goal is that this can never happen again).
1. Project model: name, slug, icon, status, playgroundIds/teamIds (by reference — never copy or modify team configs), brainNamespace (tag prefix project:<slug>), folderPath, createdAt.
2. Every project gets its own folder (volume subpath, e.g. /data/projects/<slug>/) — all project files live there only.
3. Brain isolation: project docs ingest under the project:<slug> namespace; chat/agents in project context read and write ONLY that namespace, plus global docs I explicitly grant (read-only). Nothing project-generated may touch the global Brain or any playground's docs.
4. Chat tab → Projects entry: list + create. Opening a project enters a playground-like customizable interface with reduced functions: dashboard (project-scoped widgets), chat (project context), files (project folder), schedule, settings.
5. Label every task/chat/plan created in project context with the projectId (teardown in Session 38 will enumerate by it).
Rules: no emojis. Finish with passing builds, schema push + deploy via scp, update HANDOFF.md.
```

## 🔜 Session 38 — Projects: shared work + clean teardown

```
Session 38 — UI v4 Projects (part 2: shared work + teardown). Read HANDOFF.md and docs/PLAN.md §1 (item 6) first.

1. Multi-team shared files inside a project: multiple agent teams read/write the same project files, coordinated by the Playground Keeper across the project's teams/playgrounds.
2. Surface projects in the Overview dashboard (widget) and inside involved playgrounds.
3. Delete Project: a full deletion preview (folder contents, Brain namespace doc count, tasks/chats/plans, any labeled deployments) → one confirmation → complete teardown with zero residue. Verify by creating a scratch project, generating activity, deleting it, and proving nothing remains (DB rows, brain chunks, files).
Rules: no emojis. Deletion preview is mandatory — never silent-delete. Finish with passing builds, deploy via scp, update HANDOFF.md.
```

---

## After Session 38 — resume the infrastructure roadmap (docs/PLAN.md §3–§6)

n8n MCP tools → self-service Telegram bots → permission rings + Telegram one-tap approval + audit log → agent deployment capabilities. The Session 36 capability records and Session 37–38 project labeling feed directly into the rings and deployment work.
