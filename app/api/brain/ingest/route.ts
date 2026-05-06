import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ingestToVault, indexVaultNote, extractDate, isScheduledNote } from "@/lib/brain";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text: string; title: string; tags?: string[]; folder?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, title, tags, folder } = body;
  if (!text || !title) {
    return NextResponse.json({ error: "text and title are required" }, { status: 400 });
  }

  const notePath = await ingestToVault(text, title, tags, folder);

  // Index asynchronously
  indexVaultNote({ path: notePath, title, content: text, tags: tags || [] }).catch(() => {});

  // Calendar sync: if the note looks like a scheduled event, create a ScheduledJob
  let calendarJobId: string | null = null;
  const allTags = tags || [];
  if (isScheduledNote(allTags, `${title} ${text}`)) {
    const scheduledFor = extractDate(`${title} ${text}`);
    if (scheduledFor) {
      try {
        const team = await prisma.agentTeam.findFirst({
          where: { isSystemTeam: false, status: { not: "archived" } },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true },
        });
        if (team) {
          const job = await prisma.scheduledJob.create({
            data: {
              title,
              description: `Auto-created from Brain note: ${notePath}\n\n${text.slice(0, 500)}`,
              scheduledFor,
              teamId: team.id,
              teamName: team.name,
              status: "pending",
            },
          });
          calendarJobId = job.id;
        }
      } catch {
        // Calendar sync is non-fatal
      }
    }
  }

  return NextResponse.json({ ok: true, path: notePath, calendarJobId });
}
