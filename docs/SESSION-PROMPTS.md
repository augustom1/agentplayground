# docs/SESSION-PROMPTS.md — Prompt Schedule
> Created 2026-07-04. Updated 2026-07-05: **RELEASE SPRINT** — friends release by Friday 2026-07-10
> (see `docs/PLAN.md` §0). Sessions 35–38 are now the sprint; the old 35–38 specs moved to the
> post-release section at the bottom.
> One prompt per session — paste it as the first message of a fresh Claude Code session.
> Do the sessions in order; each ends with a passing Docker build.
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

## ✅ Session 34 — Overview hub + coordinator router (done 2026-07-05)

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

---

# RELEASE SPRINT — friends release by Friday 2026-07-10 (docs/PLAN.md §0)

> Goal: app in friends' hands over the July 11–12 weekend, then content + first sales the following
> week. All week: **the downloadable app must survive a stranger's first 15 minutes.** Stability and
> first-run experience beat new features. When in doubt, fix the install path, not the roadmap.

## ✅ Session 35 — RELEASE GATE (done 2026-07-05)

```
Session 35 — RELEASE GATE for the Friday 2026-07-10 friends release. Read HANDOFF.md and docs/PLAN.md §0 first.

The bar all week: the downloadable app must survive a stranger's first 15 minutes.
0. Before anything else, check whether Docker Hub is logged in (docker login status). If not, explain to me in plain words what Docker Hub is and why the push needs it, and walk me through logging in (I'll type `! docker login` when you tell me). Friends never need a login — the image will be public and their start script pulls it automatically.
1. Fresh-install end-to-end test of the CURRENT build (this flow was last tested in Session 25 — 10 sessions of UI changes ago): build the docker package image locally, start from empty volumes, then walk the real first-run path in a browser — setup wizard → create account → API keys step → starter pack → first coordinator chat → create a playground → Quick task router. Fix everything that breaks along that path.
2. First-run empty states: Overview dashboard widgets, Plans, Teams-in-playground, Brain, Schedule. Friends see ALL of these empty on day one — each empty state must say what the thing is and offer exactly one action to get started.
3. Docker Hub push: docker build -t augustojmd/agentplayground:0.1.0 . && docker push. Rebuild the release zip (docker/build-release.sh) and verify INSTALL.md matches what actually happens.
4. Verify agentplayground.net/download and /api/version point at the real artifact.
5. Create docs/FEEDBACK.md — the friends bug-report inbox: a short template (who / what happened / what they expected / screenshot) plus instructions to me: after the release weekend I paste friends' reports here, and every post-release session reads this file FIRST and fixes reported bugs before any roadmap work.
Rules: no emojis, stability over features. Finish with passing builds, deploy via scp if app files changed, update HANDOFF.md.
```

## ✅ Session 36 — First-run experience + demo seed (done 2026-07-06 — session crashed before wrap-up; VPS deploy + zip + live verification moved to Session 37 step 0)

```
Session 36 — First-run experience + demo seed. Read HANDOFF.md and docs/PLAN.md §0 first.

0. BEFORE ANYTHING: ask me for my NVIDIA API key (nvapi-..., I have a build.nvidia.com account now) and, if I have one, a fresh ANTHROPIC_API_KEY (the one in KEYS.md is expired). Enter the NVIDIA key in a fresh packaged install and verify the free tier for real: NVIDIA-only wizard → first chat actually answers on Llama 3.1 8B → Quick task router LLM pick works → playground team chat responds. Enter fresh keys in VPS Settings → API Keys too, and update KEYS.md statuses.
1. Port lib/agents/delegated.ts and lib/agents/runner.ts to the provider abstraction (lib/providers, use defaultModelFor) so delegated/plan tasks run on NVIDIA/Ollama when no Anthropic key exists — free-tier installs currently can't run background tasks. Order: anthropic → nvidia → ollama.
2. Fix everything Session 35's install test surfaced that didn't fit in that session (fallout list in HANDOFF Session 35 notes: Blank starter isn't blank, Personal-pack teams not assigned to any playground so the router picker can't reach them, wizard accepts invalid keys silently — add a cheap validation ping, done-step copy says teams seeded even for Blank).
3. "Any model, any time": add a custom model id input to the chat model picker (per provider) so users aren't locked to the curated lists — NVIDIA alone has 100+ models.
4. Demo seed: a fresh install should feel alive, not empty — starter playground(s) with teams actually wired, 2–3 example Brain docs, one example scheduled task. All generic, nothing personal.
5. Error paths friends WILL hit: missing/invalid API key anywhere in the app must say exactly where to go (Settings → API Keys) and never look like a crash. Test with no key and with a garbage key.
6. README.md + INSTALL.md final pass as the public face of the repo.
Rules: no emojis, stability over features. Finish with passing builds, image re-pushed to Docker Hub, deploy via scp, update HANDOFF.md.
```

## 🔜 Session 37 — STRETCH: widget registry (Wed/Thu — ONLY if 35–36 are fully green)

```
Session 37 — Session 36 wrap-up + STRETCH: customizable dashboards. Read HANDOFF.md and docs/PLAN.md §0 first.

0. FIRST — finish what the Session 36 crash cut off (see HANDOFF Session 36 block):
   - Verify live in a browser: main chat custom-model input + the new ModelPicker in the playground scoped chat, one real chat on the fresh Anthropic key and one on NVIDIA.
   - scp the Session 36 files to the VPS + rebuild dashboard (ssh-verified 2026-07-06: VPS has none of the new files); confirm the fresh ANTHROPIC + NVIDIA keys are set in VPS Settings → API Keys. Release zip is already current (re-uploaded 22:04) — skip unless docker/ files change again.
   - git commit sessions 34–36 work (I'm asking for the commit now).
1. THEN, only if nothing install-critical is open — widget registry: add/remove/reorder widgets, layout persisted — per-user for the Overview tab dashboard, per-playground for playground dashboards. (The hub's Dashboard() in app/(app)/overview/page.tsx is the surface this replaces.)
2. Playground inner left menu (WORKSPACE items) becomes customizable: add/remove/reorder entries, persisted per playground. Schedule is a standard menu item — scoped to that playground only (same scoping pattern as Brain/brainTags).
3. Schema: layout JSON on Playground + user-level dashboard config (prisma db push on VPS as part of deploy).
Rules: no emojis, nothing that risks the Friday release. Finish with passing builds, deploy via scp (schema push first), update HANDOFF.md.
```

## 🔜 Session 38 — SHIP (Friday 2026-07-10)

```
Session 38 — SHIP DAY. Friends get the app this weekend. Read HANDOFF.md and docs/PLAN.md §0 first.

Zero new features today. Stability only.
1. Clean-machine install rehearsal: follow INSTALL.md literally, from download to first chat, on the final image. Fix blockers only.
2. Final artifact: tag + push the image (bump version if anything changed since 35), rebuild the release zip, update /api/version (version, downloadUrl, real changelog).
3. Write the friends announcement message for me to send: what Agent Playground is (2 sentences), requirements, install steps (3 lines), what to try first (wizard → chat → create a playground → quick task), and where to report problems.
4. Update HANDOFF.md: release shipped, sprint over; next phase = friends feedback first, then content-support work, then the deferred sessions (agent editor, Projects) from docs/PLAN.md §1.
```

---

## After the release — post-release backlog (resume in this order)

1. **Friends feedback fixes** — always first while the release is fresh (read docs/FEEDBACK.md).
2. **Content-support polish** — whatever makes the recorded demos look right (owner records: task router, Overview hub, playground creation).
3. **Sessions 39–41: Meetings + Mission Control** (owner priority 2026-07-06 — spec: docs/PLAN.md §1 item 7). Prompts below.
4. **VPS install path** (one session — spec in docs/PLAN.md Backlog): compose overlay + install-vps.sh + INSTALL VPS section + feature matrix on /download. Enables the $50 assisted install and delivers the flagship Private Server Deployments (business/03-services-pricing.md, updated 2026-07-06). Move up past Meetings if a deployment client signs.
5. **Team drill-down + per-agent editor** (docs/PLAN.md §1 item 5):
   team drill-down inside a playground; per-agent editor for provider/model, skills allowlist, Brain doc
   grants, file permissions; schema = the same capability records the permission-rings layer (PLAN §5)
   will enforce. (Also makes the meeting/board per-agent model defaults editable.)
6. **Projects part 1: isolation** (PLAN §1 item 6): Project model, own folder,
   own Brain namespace (project:<slug>), Chat-tab entry, projectId labeling. Until this exists, client
   work lives in a dedicated playground with its own brainTags (SensorGuard lesson).
7. **Projects part 2: shared work + teardown**: multi-team shared files,
   deletion preview + one-tap zero-residue teardown, verified with a scratch project.
8. **Infrastructure roadmap** (docs/PLAN.md §3–§6): n8n MCP tools → self-service Telegram bots →
   permission rings + Telegram one-tap approval + audit log → agent deployment capabilities.

---

# POST-RELEASE FEATURE BLOCK — Meetings + Mission Control (docs/PLAN.md §1 item 7)

> Owner vision (2026-07-06): *"meetings between agent teams and yourself, where you can see what they
> are planning and working on … like an open Cursor window where you see multiple agents working on
> the same project."* Mission Control = watch everything run live. Meetings = call the teams into a
> room, watch them think, decide together, dispatch the work — and watch it get done on the board.
> The task router stays the no-meeting path ("give them stuff to do without needing a meeting").

## 🔜 Session 39 — Mission Control: live agent board (PLAN §1 item 7a)

```
Session 39 — Mission Control (live agent board). Read HANDOFF.md and docs/PLAN.md §1 item 7a first. Read docs/FEEDBACK.md and fix reported bugs before starting.

1. Step-level agent events: extend lib/notify/sse.ts with an AGENT_STEP event (taskId, teamId/agentId, phase: thinking | tool_call | tool_result | output | done | failed, summary, ts). Emit from all three run loops — lib/agents/provider-loop.ts, lib/agents/runner.ts, lib/agents/delegated.ts (chat tool loop optional). Summaries must be short (tool name + one-line arg summary), never full prompts.
2. Persist steps (AgentStep table or extend the existing activity log; prisma db push on VPS at deploy) so the board shows recent history, not only what I catch live.
3. Live board UI: new "Live" section in the Overview hub (same embedded-window pattern as Brain/Schedule) — one card per active agent/task: team + agent name, current task title, current phase, iteration count, last output snippet, elapsed time. Click a card → expandable full step transcript, streaming as it runs. Idle state: "Nothing running — dispatch a task" + link to the Quick task router.
4. Playground-scoped variant: inside /playground/[id], the same board filtered to that playground's teams (same scoping pattern as Brain/brainTags).
5. Verify live: dispatch two tasks to different teams at once (route-task), watch both cards stream simultaneously.
Rules: no emojis, SSE only (no polling loops), remove rather than add. Finish with passing builds, deploy via scp (schema push first), update HANDOFF.md.
```

## 🔜 Session 40 — Meetings part 1: the meeting room (PLAN §1 item 7b core)

```
Session 40 — Meetings part 1. Read HANDOFF.md and docs/PLAN.md §1 item 7b first. Read docs/FEEDBACK.md and fix reported bugs before starting.

1. Meeting model: topic, participantTeamIds, status (live | ended), transcript (JSON turns: participant, round, content, ts), decisions (JSON), optional playgroundId, userId. prisma db push at deploy.
2. runMeeting engine: generalize lib/council/index.ts runCouncil — round-based team-head discussion with the Playground Keeper facilitating, but (a) each participant turn streams over the SSE bus as MEETING_TURN events while it generates, (b) I can interject at any time and my message joins the next round, (c) the facilitator's output schema is decisions/action-items (what, why, suggested team), not plan amendments. Keep the fast/balanced/deep thinking presets.
3. Meeting room UI: start a meeting from the Overview Live section or from a playground (participants default to the playground's teams) — setup (topic, pick teams, thinking preset, optional per-participant model override via the ModelPicker) → live room: one lane/column per participant streaming its contributions round by round, Keeper lane for synthesis, my input box always available (interject), End meeting button → decisions list rendered as cards.
4. Models per participant honor the team's provider/model config; the ModelPicker override ties into "any model, any time".
5. Verify live: run a real meeting with 2–3 teams on the free NVIDIA tier and one on Anthropic; interject mid-meeting; confirm the decisions list is coherent.
Rules: no emojis, no polling, meetings must never block the rest of the app (run server-side like delegated tasks). Finish with passing builds, deploy via scp (schema push first), update HANDOFF.md.
```

## 🔜 Session 41 — Meetings part 2: decisions → work, Brain, history (PLAN §1 item 7b close the loop)

```
Session 41 — Meetings part 2. Read HANDOFF.md and docs/PLAN.md §1 item 7b first. Read docs/FEEDBACK.md and fix reported bugs before starting.

1. Decisions → work: each decision card gets a Dispatch action feeding the existing route-task/delegate machinery (pre-filled from the decision, confirm/override team like the Quick task router). Dispatched tasks appear on the Mission Control board immediately — show the board (or a compact strip of it) inside the ended-meeting view so I watch the meeting's work get done.
2. Brain: on meeting end, ingest transcript + decisions into the Brain (playground-tagged when the meeting belongs to a playground) so future work has the context.
3. Meeting history: list past meetings (topic, date, participants, decision count) with a read-only transcript view; reachable from the Overview Live section and the playground.
4. Coordinator integration: a start_meeting chat tool so I can say "have a meeting with Marketing and Research about X" in chat and get a link to the live room.
5. Verify live: full loop — call a meeting from chat → watch it in the room → dispatch two decisions → watch them run on the board → confirm Brain ingest.
Rules: no emojis, no polling. Finish with passing builds, deploy via scp, update HANDOFF.md.
```
