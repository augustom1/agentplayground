/**
 * POST /api/files/upload — upload one or more files
 * Content-Type: multipart/form-data
 * Fields: files (File[]), path (string, target directory, default "")
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import fs from "fs";
import path from "path";

const FILES_ROOT = process.env.FILES_ROOT || path.join(process.cwd(), "data", "files");
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

function safePath(rel: string): string {
  const resolved = path.resolve(FILES_ROOT, rel.replace(/^\/+/, ""));
  if (!resolved.startsWith(FILES_ROOT)) throw new Error("Path traversal detected");
  return resolved;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const targetRel = (formData.get("path") as string) || "";
    const targetAbs = safePath(targetRel);

    if (!fs.existsSync(FILES_ROOT)) fs.mkdirSync(FILES_ROOT, { recursive: true });
    if (!fs.existsSync(targetAbs)) fs.mkdirSync(targetAbs, { recursive: true });

    const files = formData.getAll("files") as File[];
    if (!files.length) return NextResponse.json({ error: "No files provided" }, { status: 400 });

    const uploaded: Array<{ name: string; path: string; size: number }> = [];

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 100 MB limit` },
          { status: 413 }
        );
      }

      // Sanitize filename — no path separators
      const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._\-() ]/g, "_");
      const destAbs = path.join(targetAbs, safeName);
      const destRel = targetRel ? `${targetRel}/${safeName}` : safeName;

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(destAbs, buffer);
      uploaded.push({ name: safeName, path: destRel, size: file.size });
    }

    return NextResponse.json({ uploaded });
  } catch (err) {
    return apiError(err);
  }
}
