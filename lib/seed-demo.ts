import { prisma } from "@/lib/prisma";
import { writeVaultNote } from "@/lib/brain";
import { ingestToBrain } from "@/lib/brain/ingest";

// Generic demo content so a fresh install feels alive instead of empty.
// Nothing personal, nothing install-specific. Safe to run multiple times:
// vault notes are overwritten in place, Brain ingest dedupes by source,
// the scheduled job is looked up by title before creating.

const DEMO_DOCS: Array<{ path: string; title: string; source: string; content: string }> = [
  {
    path: "welcome/what-is-the-brain.md",
    title: "What is the Brain",
    source: "demo:what-is-the-brain",
    content: `# What is the Brain

The Brain is your platform's shared knowledge base. Documents stored here are chunked,
indexed, and made searchable — every agent team can read from it for context when
working on your tasks.

## How agents use it

- When you delegate a task, the assigned team searches the Brain for relevant context first.
- Completed task results are archived back into the Brain automatically, so knowledge compounds.
- Chat agents can search and write notes here with their vault tools.

## How to add knowledge

1. Open Overview > Brain and use the folder view to add notes.
2. Ask any agent in chat to "save this to the brain" after a useful answer.
3. Task results land here on their own once teams start completing work.

Replace this note with your own content whenever you like — it is just a starting example.`,
  },
  {
    path: "welcome/example-project-brief.md",
    title: "Example Project Brief",
    source: "demo:example-project-brief",
    content: `# Example Project Brief — Website Refresh

This is a sample brief showing the level of detail that helps agent teams work well.
Delete it or copy the structure for a real project.

## Goal

Refresh the public website: clearer messaging, faster pages, one new case-study section.

## Scope

- Rewrite the landing page hero and the three feature blurbs
- Compress and lazy-load all images over 200 KB
- Add a "Case Studies" section with two entries
- Keep the existing color palette and typography

## Constraints

- No new frameworks or build tools
- All copy in plain language a non-technical visitor understands
- Ship behind a preview link before replacing the live site

## How you might use this

Open the Quick task router and try: "Write two case-study drafts for the website refresh
using the example project brief in the Brain" — the assigned team will find this note.`,
  },
  {
    path: "welcome/how-to-delegate-work.md",
    title: "How to Delegate Work",
    source: "demo:how-to-delegate-work",
    content: `# How to Delegate Work

Three ways to get work done here, from lightest to heaviest:

## 1. Chat (ask directly)

Talk to the Coordinator on the Chat tab. It answers directly or hands the request to a
team with the delegate tool. Best for questions and one-shot pieces of work.

## 2. Quick task (the router)

The Quick task button on the Playgrounds tab. Describe the outcome you want, confirm the
suggested team (or pick one yourself), and the task runs in the background while you do
something else. Results appear in the task list and are archived to the Brain.

## 3. Plans (multi-team work)

For work that needs several teams, ask the Coordinator to "create a plan for ...".
A plan is drafted, reviewed, and dispatched task-by-task to the right teams in parallel.
Watch progress on the Plans page.

A good task description says: the outcome you want, any constraints, and where the
context lives (for example "using the example project brief in the Brain").`,
  },
];

export async function seedDemoContent(): Promise<void> {
  // Vault notes (visible in the Brain folder view) + Brain index (searchable by agents)
  for (const doc of DEMO_DOCS) {
    await writeVaultNote(doc.path, doc.content).catch(() => {});
    await ingestToBrain({
      content: doc.content,
      title: doc.title,
      source: doc.source,
      sourceType: "manual",
      metadata: { demo: true },
    }).catch(() => {});
  }

  // One example scheduled task on the first available team
  const DEMO_JOB_TITLE = "Weekly review — summarize completed tasks";
  const existing = await prisma.scheduledJob.findFirst({ where: { title: DEMO_JOB_TITLE }, select: { id: true } });
  if (!existing) {
    const team = await prisma.agentTeam.findFirst({
      where: { isSystemTeam: false },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    if (team) {
      // Next Monday, 09:00 local
      const next = new Date();
      next.setDate(next.getDate() + ((8 - next.getDay()) % 7 || 7));
      next.setHours(9, 0, 0, 0);
      await prisma.scheduledJob.create({
        data: {
          title: DEMO_JOB_TITLE,
          description: "Example recurring job: review the tasks completed this week and write a short summary note to the Brain. Edit or delete it on the Schedule page.",
          scheduledFor: next,
          recurring: "weekly",
          status: "pending",
          teamId: team.id,
          teamName: team.name,
        },
      }).catch(() => {});
    }
  }

  console.log("[seed-demo] Demo content seeded.");
}
