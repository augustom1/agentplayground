import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { getEmbedProvider } from "@/lib/providers";
import type { Prisma } from "@prisma/client";

const CHUNK_TARGET = 500;  // target tokens per chunk (rough: 1 token ≈ 4 chars)
const CHUNK_CHARS  = CHUNK_TARGET * 4;
const OVERLAP_CHARS = 64 * 4; // 64 token overlap

// ── Chunking ──────────────────────────────────────────────────────────────────

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_CHARS) return [text];

  const chunks: string[] = [];
  // Prefer splitting at paragraph boundaries
  const paragraphs = text.split(/\n{2,}/);
  let current = "";

  for (const para of paragraphs) {
    if ((current + para).length > CHUNK_CHARS && current.length > 0) {
      chunks.push(current.trim());
      // Carry overlap: last N chars of current chunk
      current = current.slice(-OVERLAP_CHARS) + "\n\n" + para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Safety: split any chunk that's still too large at sentence boundaries
  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= CHUNK_CHARS * 1.5) {
      result.push(chunk);
    } else {
      const sentences = chunk.match(/[^.!?]+[.!?]+/g) || [chunk];
      let sub = "";
      for (const s of sentences) {
        if ((sub + s).length > CHUNK_CHARS && sub.length > 0) {
          result.push(sub.trim());
          sub = sub.slice(-OVERLAP_CHARS) + s;
        } else {
          sub += s;
        }
      }
      if (sub.trim()) result.push(sub.trim());
    }
  }

  return result.filter((c) => c.trim().length > 20);
}

// ── Main ingest function ──────────────────────────────────────────────────────

export interface IngestParams {
  content: string;
  title: string;
  source: string;
  sourceType?: string;  // vault | file | web | plan | report | manual
  metadata?: Record<string, unknown>;
  force?: boolean;      // skip deduplication check
}

export async function ingestToBrain(params: IngestParams): Promise<string> {
  const { content, title, source, sourceType = "manual", metadata = {}, force = false } = params;

  if (!content?.trim()) return "";

  // Deduplication: skip if identical content already indexed
  const hash = createHash("sha256").update(content).digest("hex");

  if (!force) {
    const existing = await prisma.brainDocument.findFirst({
      where: { contentHash: hash },
      select: { id: true },
    });
    if (existing) return existing.id;
  }

  // Create or update BrainDocument
  const meta = metadata as Prisma.InputJsonValue;
  const doc = await prisma.brainDocument.upsert({
    where: { source },
    create: { title, source, sourceType, contentHash: hash, metadata: meta },
    update: { title, sourceType, contentHash: hash, metadata: meta, updatedAt: new Date() },
  });

  // Delete old chunks for this document (re-chunking after content change)
  await prisma.brainChunk.deleteMany({ where: { documentId: doc.id } });

  // Chunk and embed
  const chunks = splitIntoChunks(content);
  const embedProvider = await getEmbedProvider();

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];
    let embedding: number[] | undefined;

    try {
      embedding = await embedProvider.embed(chunkContent.slice(0, 8000));
    } catch {
      // Embedding failure is non-fatal — chunk stored without vector
    }

    const chunkMeta: Prisma.InputJsonValue = { ...metadata, chunkIndex: i, totalChunks: chunks.length };
    const chunk = await prisma.brainChunk.create({
      data: {
        documentId: doc.id,
        chunkIndex: i,
        content: chunkContent,
        metadata: chunkMeta,
      },
    });

    if (embedding) {
      const vectorStr = `[${embedding.join(",")}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE brain_chunks SET embedding = $1::vector WHERE id = $2`,
        vectorStr,
        chunk.id
      );
    }
  }

  return doc.id;
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

export async function ingestPlanToBrain(planId: string, planJson: string): Promise<void> {
  await ingestToBrain({
    content: planJson,
    title: `Plan ${planId}`,
    source: `plan:${planId}`,
    sourceType: "plan",
    metadata: { planId },
  });
}

export async function ingestReportToBrain(params: {
  planId: string;
  teamId: string;
  reportId: string;
  content: string;
}): Promise<void> {
  await ingestToBrain({
    content: params.content,
    title: `Report by team ${params.teamId} for plan ${params.planId}`,
    source: `report:${params.reportId}`,
    sourceType: "report",
    metadata: { planId: params.planId, teamId: params.teamId },
  });
}
