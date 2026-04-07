/**
 * GET  /api/files?path=        — list directory contents
 * POST /api/files              — create directory  { path: string }
 * DELETE /api/files?path=      — delete file or directory
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import fs from "fs";
import path from "path";

const FILES_ROOT = process.env.FILES_ROOT || path.join(process.cwd(), "data", "files");

/** Ensure the path stays inside FILES_ROOT (prevent path traversal) */
function safePath(rel: string): string {
  const resolved = path.resolve(FILES_ROOT, rel.replace(/^\/+/, ""));
  if (!resolved.startsWith(FILES_ROOT)) {
    throw new Error("Path traversal detected");
  }
  return resolved;
}

function statToEntry(name: string, abs: string, rel: string) {
  const s = fs.statSync(abs);
  return {
    name,
    path: rel,
    isDirectory: s.isDirectory(),
    size: s.isDirectory() ? 0 : s.size,
    modifiedAt: s.mtime.toISOString(),
    mimeType: s.isDirectory() ? null : getMime(name),
  };
}

function getMime(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    ".txt": "text/plain", ".md": "text/markdown", ".csv": "text/csv",
    ".json": "application/json", ".pdf": "application/pdf",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".mp4": "video/mp4", ".mp3": "audio/mpeg",
    ".zip": "application/zip", ".gz": "application/gzip",
    ".py": "text/x-python", ".ts": "text/typescript", ".js": "text/javascript",
    ".html": "text/html", ".css": "text/css", ".sh": "text/x-sh",
    ".yaml": "text/yaml", ".yml": "text/yaml",
  };
  return map[ext] || "application/octet-stream";
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rel = req.nextUrl.searchParams.get("path") || "";
    const abs = safePath(rel);

    if (!fs.existsSync(FILES_ROOT)) fs.mkdirSync(FILES_ROOT, { recursive: true });
    if (!fs.existsSync(abs)) return NextResponse.json({ error: "Path not found" }, { status: 404 });

    const stat = fs.statSync(abs);
    if (!stat.isDirectory()) {
      // Return single file info
      return NextResponse.json({ entry: statToEntry(path.basename(abs), abs, rel) });
    }

    const names = fs.readdirSync(abs);
    const entries = names
      .map((name) => {
        const childAbs = path.join(abs, name);
        const childRel = rel ? `${rel}/${name}` : name;
        try { return statToEntry(name, childAbs, childRel); } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Directories first, then alphabetical
        if (a!.isDirectory !== b!.isDirectory) return a!.isDirectory ? -1 : 1;
        return a!.name.localeCompare(b!.name);
      });

    return NextResponse.json({ path: rel, entries });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { path: rel } = await req.json() as { path: string };
    if (!rel) return NextResponse.json({ error: "path required" }, { status: 400 });

    const abs = safePath(rel);
    if (fs.existsSync(abs)) return NextResponse.json({ error: "Already exists" }, { status: 409 });

    fs.mkdirSync(abs, { recursive: true });
    return NextResponse.json({ created: true, path: rel });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rel = req.nextUrl.searchParams.get("path");
    if (!rel) return NextResponse.json({ error: "path required" }, { status: 400 });

    const abs = safePath(rel);
    if (!fs.existsSync(abs)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      fs.rmSync(abs, { recursive: true, force: true });
    } else {
      fs.unlinkSync(abs);
    }

    return NextResponse.json({ deleted: true, path: rel });
  } catch (err) {
    return apiError(err);
  }
}
