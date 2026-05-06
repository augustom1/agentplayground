import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await prisma.vaultNote.findMany({
    select: { path: true, title: true, tags: true },
    take: 300,
    orderBy: { updatedAt: "desc" },
  });

  const nodes = notes.map((n) => ({
    id: n.path,
    title: n.title || n.path.split("/").pop()?.replace(/\.md$/, "") || n.path,
    tags: n.tags,
    folder: n.path.split("/")[0] || "inbox",
  }));

  const edges: { source: string; target: string; label: string }[] = [];
  const edgeSet = new Set<string>();

  // Tag-based edges
  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const shared = notes[i].tags.filter((t) => notes[j].tags.includes(t));
      if (shared.length > 0) {
        const key = [notes[i].path, notes[j].path].sort().join("|||");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: notes[i].path, target: notes[j].path, label: shared[0] });
        }
      }
    }
  }

  // Folder-based edges (same folder = weak connection, up to 10 per folder)
  const folderGroups: Record<string, string[]> = {};
  for (const n of notes) {
    const f = n.path.split("/")[0];
    if (f === "inbox") continue;
    folderGroups[f] = folderGroups[f] || [];
    folderGroups[f].push(n.path);
  }
  for (const [folder, paths] of Object.entries(folderGroups)) {
    const limit = Math.min(paths.length, 8);
    for (let i = 0; i < limit; i++) {
      for (let j = i + 1; j < limit; j++) {
        const key = [paths[i], paths[j]].sort().join("|||");
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push({ source: paths[i], target: paths[j], label: folder });
        }
      }
    }
  }

  return NextResponse.json({ nodes, edges });
}
