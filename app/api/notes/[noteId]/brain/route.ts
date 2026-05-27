export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { ingestToBrain } from "@/lib/brain/ingest";

const CATEGORY_SOURCE_TYPES: Record<string, string> = {
  cv:        "manual",
  business:  "manual",
  education: "research",
  finance:   "manual",
  fitness:   "manual",
  personal:  "manual",
  dev:       "manual",
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { noteId } = await params;
  const note = await prisma.userNote.findFirst({ where: { id: noteId, userId: session.user.id } });
  if (!note) return apiError("Not found", 404);

  const sourceType = CATEGORY_SOURCE_TYPES[note.category] ?? "manual";

  const docId = await ingestToBrain({
    content: `# ${note.title}\n\n**Category:** ${note.category}\n\n${note.content}`,
    title: note.title,
    source: `user-note:${note.id}`,
    sourceType,
    metadata: { category: note.category, userId: session.user.id, noteId: note.id },
  });

  await prisma.userNote.update({
    where: { id: noteId },
    data: { inBrain: true, brainDocId: docId || null },
  });

  return NextResponse.json({ ok: true, docId });
}
