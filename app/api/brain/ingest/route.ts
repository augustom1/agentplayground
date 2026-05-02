import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ingestToVault, indexVaultNote } from "@/lib/brain";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text: string; title: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, title, tags } = body;
  if (!text || !title) {
    return NextResponse.json({ error: "text and title are required" }, { status: 400 });
  }

  const notePath = await ingestToVault(text, title, tags);

  // Index asynchronously — don't block the response
  indexVaultNote({ path: notePath, title, content: text, tags: tags || [] }).catch(() => {});

  return NextResponse.json({ ok: true, path: notePath });
}
