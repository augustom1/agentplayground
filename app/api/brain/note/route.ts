import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readVaultNote, writeVaultNote } from "@/lib/brain";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notePath = req.nextUrl.searchParams.get("path");
  if (!notePath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const content = await readVaultNote(notePath);
  if (content === null) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ path: notePath, content });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { path: string; content: string; append?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { path: notePath, content, append } = body;
  if (!notePath || content === undefined) {
    return NextResponse.json({ error: "path and content are required" }, { status: 400 });
  }

  await writeVaultNote(notePath, content, append);
  return NextResponse.json({ ok: true, path: notePath });
}
