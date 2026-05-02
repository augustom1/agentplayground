import { NextRequest, NextResponse } from "next/server";
import { indexVaultNote } from "@/lib/brain";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-brain-secret");
  if (!process.env.BRAIN_SECRET || secret !== process.env.BRAIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    path: string;
    content: string;
    title?: string;
    frontmatter?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { path, content, title, frontmatter } = body;
  if (!path || !content) {
    return NextResponse.json({ error: "path and content are required" }, { status: 400 });
  }

  const noteTitle =
    title ||
    (frontmatter?.title as string | undefined) ||
    path.split("/").pop()?.replace(".md", "") ||
    path;
  const tags = (frontmatter?.tags as string[] | undefined) || [];

  await indexVaultNote({ path, title: noteTitle, content, tags, frontmatter });

  return NextResponse.json({ ok: true, path });
}
