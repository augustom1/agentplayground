/**
 * GET /api/files/download?path= — stream file download
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

const FILES_ROOT = process.env.FILES_ROOT || path.join(process.cwd(), "data", "files");

function safePath(rel: string): string {
  const resolved = path.resolve(FILES_ROOT, rel.replace(/^\/+/, ""));
  if (!resolved.startsWith(FILES_ROOT)) throw new Error("Path traversal detected");
  return resolved;
}

function getMime(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    ".txt": "text/plain", ".md": "text/markdown", ".csv": "text/csv",
    ".json": "application/json", ".pdf": "application/pdf",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
  };
  return map[ext] || "application/octet-stream";
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });

    const rel = req.nextUrl.searchParams.get("path");
    if (!rel) return new Response("path required", { status: 400 });

    const abs = safePath(rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      return new Response("File not found", { status: 404 });
    }

    const stat = fs.statSync(abs);
    const name = path.basename(abs);
    const mime = getMime(name);

    // Stream the file
    const stream = fs.createReadStream(abs);
    const readable = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
}
