# UX Redesign Plan — Navigation & Information Architecture
> Status: Ready to build (next dedicated session)
> Created: 2026-05-18
> See HANDOFF.md for session context.

---

## The Problem

The current app has 15+ flat nav items mixed in a sidebar. For new or non-technical users the labels make no sense ("Agent Lab", "Optimize", "Pipeline"). On mobile it's a flat "More" drawer with everything dumped in. There's no mental model — no answer to "what do I do here?"

The user's mental model should be:
> "I talk to my agents (Chat). I manage them (Teams). I give them work and track it (Playground). I manage the technical setup (Stack). And settings/billing are in Settings."

---

## New Information Architecture

### Bottom Nav (Mobile) — 5 tabs
| Tab | Icon | What it is |
|---|---|---|
| **Home** | House | Dashboard overview — activity, quick stats |
| **Chat** | MessageSquare | Talk to the AI / agents |
| **Teams** | Users | Manage agent teams |
| **Playground** | Layers | All work: projects, schedule, meetings, file jobs |
| **More** | MoreHorizontal | Stack + Settings drawer |

### Sidebar (Desktop) — Grouped sections
```
─ Home
─ Chat

─ WORK
  Teams            (/agent-lab → rename to /teams)
  Playground       (/playground — new hub page)
    ├─ Projects    (/projects)
    ├─ Schedule    (/schedule)
    ├─ Meetings    (/schedule → Meetings tab)
    └─ Work Queue  (/pipeline — renamed from Pipeline)

─ KNOWLEDGE
  Brain / Files    (/files)

─ STACK           (power users / technical)
  Optimize         (/optimize)
  Server           (/server)
  Websites         (/websites)
  Apps & Tools     (/tools)
  Connect          (/connect)
  Blog             (/blog)

─ SETTINGS
  Billing          (/billing)
  Users            (/users — admin only)
  App Settings     (/settings)
```

---

## Page Renames (URL stays the same, label changes)

| Current label | New label | Why |
|---|---|---|
| Agent Lab | **Teams** | "Lab" implies experimentation, not everyday use |
| Pipeline | **Work Queue** | "Queue jobs for your agents to process" — much clearer |
| Knowledge | **Brain / Files** | Keep Brain metaphor but add context |
| Optimize | **AI Efficiency** | "Save money by routing tasks to local AI" |
| Connect | **Integrations** | What it actually does — connects to Telegram, n8n, etc. |
| Tools | **Apps & Tools** | More approachable |
| Schedule | **Schedule & Events** | Now includes meetings |

---

## "Playground" Hub Page (/playground)

New page that acts as a landing for all work-related features. Think of it as the "work room":

```
┌─────────────────────────────────────────────────┐
│  Your Playground                                │
│  "Where you and your agents get work done"      │
│                                                 │
│  [Projects]  [Schedule]  [Meetings]  [Work Queue] │
│                                                 │
│  Upcoming this week:                            │
│  • Mon 9am — Weekly sync (Dev Core)             │
│  • Tue — Content review (Blog Team)             │
│                                                 │
│  Active projects (3):                           │
│  • Blog Pipeline  [active]                      │
│  • Q2 Campaign    [active]                      │
│  • Dev Roadmap    [paused]                      │
└─────────────────────────────────────────────────┘
```

---

## "Stack" Hub Page (/stack)

New page for technical/infrastructure features. Only power users need this regularly.

```
┌─────────────────────────────────────────────────┐
│  Your Stack                                     │
│  "Manage the infrastructure your agents run on" │
│                                                 │
│  [AI Efficiency]  [Server]  [Websites]          │
│  [Apps & Tools]   [Integrations]  [Blog]        │
└─────────────────────────────────────────────────┘
```

---

## Grandpa UX Principles

These must be applied throughout, not just in navigation:

1. **Plain English labels** — no jargon. "Teams" not "Agent Lab". "Work Queue" not "Pipeline". "Brain" or "Knowledge" not "Vault".

2. **Show purpose, not function** — Every section header or empty state should say what it's FOR, not what it IS. Example:
   - BAD: "No scheduled jobs"
   - GOOD: "Nothing scheduled yet. Your agents can remind you before meetings, run tasks on a schedule, or repeat work automatically."

3. **Large touch targets** — Every tappable item min 44×44px. Especially on mobile.

4. **Visual grouping** — Use section headers, subtle dividers, and color-coded cards to group related things.

5. **Progressive disclosure** — The main view shows the most important things. Advanced options (like cron expressions, API keys, SSH config) are hidden behind a secondary interaction.

6. **Clear call-to-action on every empty state** — If a section is empty, tell the user what to do next in one sentence, with a button.

7. **Consistent terminology** — Never use both "Agent" and "Bot" for the same thing. Never say "Team" in one place and "Agent Group" in another. Lock in the vocabulary:
   - **Team** = a group of agents with a purpose
   - **Agent** = an individual AI with a role
   - **Meeting** = a scheduled event with participants
   - **Job / Task** = work given to a team
   - **Project** = a goal with multiple tasks over time

---

## Language / Localization File

> **Create file: `docs/LANGUAGE-TODO.md`** in a future session.

The language toggle exists (`useLanguage` hook, `LanguageProvider`) but only some strings are translated. Needed:
- Audit all `t("key")` calls vs hardcoded English strings
- Add Spanish (es) translations for all nav labels and page titles
- The language button in Settings needs to show current language and a clear dropdown
- Consider: auto-detect browser language on first visit

---

## Implementation Checklist (for the build session)

### Phase 1 — Navigation restructure (2–3h)
- [ ] `components/Sidebar.tsx` — Add section groupings (WORK / KNOWLEDGE / STACK / SETTINGS), rename items, hide Stack by default with expand toggle
- [ ] `components/MobileNav.tsx` — Update PRIMARY_TABS to: Home, Chat, Teams, Playground, More. Update More drawer to use grouped sections.
- [ ] Create `/app/(app)/playground/page.tsx` — Hub page with 4 cards + upcoming meetings + active projects
- [ ] Create `/app/(app)/stack/page.tsx` — Hub page with infrastructure links
- [ ] Rename "Pipeline" to "Work Queue" in sidebar + page title (URL stays `/pipeline`)

### Phase 2 — Empty states & language audit (1–2h)
- [ ] Update every empty state across all pages to have descriptive text + a CTA
- [ ] Review all page titles and subtitles — plain English, purpose-focused
- [ ] Update `MobileNav` "More" drawer to show grouped sections with descriptions

### Phase 3 — Mobile-specific fixes (2–3h, use `docs/PHONE-UX-TODO.md`)
- [ ] Chat input keyboard handling (iOS push-up issue)
- [ ] Calendar grid → list view on mobile
- [ ] Fix all remaining `width: fixed px` modals
- [ ] Font size floor audit (nothing below 11px)
- [ ] Touch target audit (44px min)

### Phase 4 — Language file (1h, separate session)
- [ ] Create `docs/LANGUAGE-TODO.md`
- [ ] Audit all hardcoded strings
- [ ] Add Spanish translations to `locales/es.ts`

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `components/Sidebar.tsx` | Edit | Add section groupings, rename labels |
| `components/MobileNav.tsx` | Edit | New PRIMARY_TABS + grouped More drawer |
| `app/(app)/playground/page.tsx` | Create | Hub page |
| `app/(app)/stack/page.tsx` | Create | Hub page |
| `app/(app)/pipeline/page.tsx` | Edit | Rename title to "Work Queue" |
| All pages | Edit | Empty states, page titles/subtitles |
| `docs/LANGUAGE-TODO.md` | Create | Language/i18n future work |
