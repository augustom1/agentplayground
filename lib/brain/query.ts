import { prisma } from "@/lib/prisma";
import { getEmbedProvider } from "@/lib/providers";

export interface BrainChunkResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  score: number;
  source: string;
  sourceType: string;
  metadata: Record<string, unknown>;
}

export interface QueryBrainParams {
  query: string;
  topK?: number;            // default 8
  filter?: {
    sourceType?: string[];  // ["vault","file","plan","report","manual"]
    planId?: string;
    since?: Date;
  };
}

/**
 * Query the Agent Brain.
 * Returns top-K chunks ranked by cosine similarity + recency boost.
 * Falls back to vault_notes if brain_chunks is empty.
 */
export async function queryBrain(params: QueryBrainParams): Promise<BrainChunkResult[]> {
  const { query, topK = 8, filter } = params;

  let embedding: number[];
  try {
    const embedProvider = await getEmbedProvider();
    embedding = await embedProvider.embed(query.slice(0, 4000));
  } catch {
    return [];
  }

  const vectorStr = `[${embedding.join(",")}]`;

  // Build WHERE clause for metadata filters
  const conditions: string[] = ["bc.embedding IS NOT NULL"];
  const bindings: (string | string[] | Date)[] = [vectorStr];
  let bindIdx = 2;

  if (filter?.sourceType?.length) {
    conditions.push(`bd."sourceType" = ANY($${bindIdx}::text[])`);
    bindings.push(filter.sourceType);
    bindIdx++;
  }

  if (filter?.planId) {
    conditions.push(`bd.metadata->>'planId' = $${bindIdx}`);
    bindings.push(filter.planId);
    bindIdx++;
  }

  if (filter?.since) {
    conditions.push(`bc."createdAt" >= $${bindIdx}`);
    bindings.push(filter.since);
    bindIdx++;
  }

  const where = conditions.join(" AND ");

  // Recency boost: score * (1 + 0.1 * exp(-days/30))
  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    documentId: string;
    chunkIndex: number;
    content: string;
    score: number;
    source: string;
    sourceType: string;
    metadata: unknown;
    createdAt: Date;
  }>>(
    `SELECT
       bc.id,
       bc."documentId",
       bc."chunkIndex",
       bc.content,
       (1 - (bc.embedding <=> $1::vector)) *
         (1 + 0.1 * exp(-EXTRACT(EPOCH FROM (NOW() - bc."createdAt")) / (30 * 86400))) AS score,
       bd.source,
       bd."sourceType",
       bc.metadata,
       bc."createdAt"
     FROM brain_chunks bc
     JOIN brain_documents bd ON bc."documentId" = bd.id
     WHERE ${where}
     ORDER BY bc.embedding <=> $1::vector
     LIMIT $${bindIdx}`,
    vectorStr,
    ...bindings.slice(1),
    topK * 2  // over-fetch then re-rank by boosted score
  );

  // Sort by boosted score and take topK
  const sorted = rows
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return sorted.map((r) => ({
    id: r.id,
    documentId: r.documentId,
    chunkIndex: r.chunkIndex,
    content: r.content,
    score: r.score,
    source: r.source,
    sourceType: r.sourceType,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));
}

/**
 * Format brain results as a context string for injection into agent prompts.
 */
export function formatBrainContext(chunks: BrainChunkResult[], maxChars = 4000): string {
  if (chunks.length === 0) return "";

  let out = "## Relevant context from the Brain\n\n";
  let chars = out.length;

  for (const chunk of chunks) {
    const entry = `**Source:** ${chunk.source} (relevance: ${(chunk.score * 100).toFixed(0)}%)\n\n${chunk.content}\n\n---\n\n`;
    if (chars + entry.length > maxChars) break;
    out += entry;
    chars += entry.length;
  }

  return out.trim();
}
