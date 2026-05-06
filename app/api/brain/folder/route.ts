import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs/promises";
import path from "path";

const VAULT_PATH = process.env.VAULT_PATH || "/var/syncthing/vault";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { path: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const folderPath = body.path?.replace(/\.\./g, "").replace(/^\//, "").trim();
  if (!folderPath) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const fullPath = path.join(VAULT_PATH, folderPath);
  await fs.mkdir(fullPath, { recursive: true });

  return NextResponse.json({ ok: true, path: folderPath });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const folderPath = req.nextUrl.searchParams.get("path")?.replace(/\.\./g, "").replace(/^\//, "");
  if (!folderPath) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const fullPath = path.join(VAULT_PATH, folderPath);
  await fs.rm(fullPath, { recursive: true, force: true });

  return NextResponse.json({ ok: true });
}
