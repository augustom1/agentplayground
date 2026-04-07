/**
 * POST /api/files/embed — embed a file's content into pgvector
 *
 * Body: { path: string }
 *
 * Uses Ollama's nomic-embed-text model (768-dim, free/local).
 * Falls back gracefully if Ollama is not reachable.
 *
 * Splits files into 512-token chunks (~2000 chars) for better recall.
 * Existing embeddings for the same file are replaced.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import fs from "fs";
import path from "path";

const FILES_ROOT = process.env.FILES_ROOT || path.join(process.cwd(), "data", "files");
const CHUNK_SIZE = 2000; // characters per chunk (~512 tokens)
const EMBED_MODEL = "nomic-embed-text";

// Text-extractable extensions
const TEXT_EXTS = new Set([
  ".txt", ".md", ".csv", ".json", ".yaml", ".yml", ".html", ".htm",
  ".ts", ".tsx", ".js", ".jsx", ".py", ".sh", ".css", ".sql",
  ".xml", ".toml", ".ini", ".conf", ".env",
]);

function safePath(rel: string): string {
  const resolved = path.resolve(FILES_ROOT, rel.replace(/^\/+/, ""));
  if (!resolved.startsWith(FILES_ROOT)) throw new Error("Path traversal detected");
  return resolved;
}

function isEmbeddable(name: string): boolean {
  return TEXT_EXTS.has(path.extname(name).toLowerCase());
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

async function getEmbedding(text: string): Promise<number[] | null> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
  try {
    const res = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { embedding: number[] };
    return data.embedding ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { path: rel } = await req.json() as { path: string };
    if (!rel) return NextResponse.json({ error: "path required" }, { status: 400 });

    const abs = safePath(rel);
    const name = path.basename(abs);

    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!isEmbeddable(name)) {
      return NextResponse.json(
        { error: `File type not supported for embedding. Supported: ${[...TEXT_EXTS].join(", ")}` },
        { status: 400 }
      );
    }

    const content = fs.readFileSync(abs, "utf-8");
    if (!content.trim()) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const chunks = chunkText(content);

    // Delete existing embeddings for this file
    await prisma.$executeRaw`DELETE FROM file_embeddings WHERE "filePath" = ${rel}`;

    let embeddedChunks = 0;
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const vector = await getEmbedding(chunks[i]);
      if (!vector) {
        errors.push(`chunk ${i}: Ollama not reachable`);
        continue;
      }

      // Insert using raw SQL for pgvector compatibility
      await prisma.$executeRaw`
        INSERT INTO file_embeddings ("id", "filePath", "chunkIndex", "content", "vector", "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${rel},
          ${i},
          ${chunks[i]},
          ${JSON.stringify(vector)}::vector,
          now()
        )
      `;
      embeddedChunks++;
    }

    // Update FileRecord.embedded flag
    await prisma.fileRecord.upsert({
      where: { path: rel },
      update: { embedded: embeddedChunks > 0, name },
      create: {
        name,
        path: rel,
        size: fs.statSync(abs).size,
        mimeType: "text/plain",
        embedded: embeddedChunks > 0,
      },
    });

    return NextResponse.json({
      success: embeddedChunks > 0,
      chunks: chunks.length,
      embeddedChunks,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    return apiError(err);
  }
}
