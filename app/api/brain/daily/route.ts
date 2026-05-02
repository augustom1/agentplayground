import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDailyNotes, writeVaultNote } from "@/lib/brain";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const last = Math.min(parseInt(req.nextUrl.searchParams.get("last") || "3"), 30);
  const notes = await getDailyNotes(last);
  return NextResponse.json({ notes });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { content: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content } = body;
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];
  await writeVaultNote(`daily/${today}.md`, content, true);
  return NextResponse.json({ ok: true, date: today });
}
