import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { readVaultNote, writeVaultNote, syncTeamFromConfig } from "@/lib/brain";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

const VAULT_PATH = process.env.VAULT_PATH || "/var/syncthing/vault";

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

  // Auto-sync: if this is a team config file, push changes to the DB
  if (!append && /^Teams\/[^/]+\/config\.json$/.test(notePath)) {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (parsed.teamId) {
        const syncResult = await syncTeamFromConfig(parsed);
        return NextResponse.json({ ok: true, path: notePath, syncResult });
      }
      return NextResponse.json({ ok: true, path: notePath, syncWarning: "Saved but not synced — missing teamId in config.json" });
    } catch {
      return NextResponse.json({ ok: true, path: notePath, syncWarning: "Saved but not synced — invalid JSON" });
    }
  }

  return NextResponse.json({ ok: true, path: notePath });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notePath = req.nextUrl.searchParams.get("path")?.replace(/\.\./g, "").replace(/^\//, "");
  if (!notePath) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const fullPath = path.join(VAULT_PATH, notePath);
  await fs.rm(fullPath, { force: true });
  await prisma.vaultNote.deleteMany({ where: { path: notePath } });

  return NextResponse.json({ ok: true });
}
