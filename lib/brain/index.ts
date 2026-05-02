import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

const VAULT_PATH = process.env.VAULT_PATH || "/var/syncthing/vault";
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://ollama:11434";

export interface VaultNoteResult {
  path: string;
  title: string;
  content: string;
  score?: number;
}

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Ollama embed error: ${res.status}`);
  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

export async function searchVault(
  query: string,
  topK = 5
): Promise<VaultNoteResult[]> {
  try {
    const embedding = await embed(query);
    const vectorStr = `[${embedding.join(",")}]`;
    const results = await prisma.$queryRawUnsafe<
      Array<{ path: string; title: string; content: string; score: number }>
    >(
      `SELECT path, title, LEFT(content, 500) AS content,
       1 - (embedding <=> $1::vector) AS score
       FROM vault_notes
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      vectorStr,
      topK
    );
    return results;
  } catch {
    return [];
  }
}

export async function readVaultNote(notePath: string): Promise<string | null> {
  try {
    const safePath = notePath.replace(/\.\./g, "").replace(/^\//, "");
    const fullPath = path.join(VAULT_PATH, safePath);
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    return null;
  }
}

export async function writeVaultNote(
  notePath: string,
  content: string,
  append = false
): Promise<void> {
  const safePath = notePath.replace(/\.\./g, "").replace(/^\//, "");
  const fullPath = path.join(VAULT_PATH, safePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  if (append) {
    await fs.appendFile(fullPath, `\n${content}`, "utf-8");
  } else {
    await fs.writeFile(fullPath, content, "utf-8");
  }
}

export async function getDailyNotes(last = 3): Promise<VaultNoteResult[]> {
  const results: VaultNoteResult[] = [];
  const today = new Date();
  for (let i = 0; i < last; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const notePath = `daily/${dateStr}.md`;
    const content = await readVaultNote(notePath);
    if (content) {
      results.push({ path: notePath, title: `Daily Note ${dateStr}`, content });
    }
  }
  return results;
}

export async function ingestToVault(
  text: string,
  title: string,
  tags: string[] = []
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "-");
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/-+$/, "");
  const notePath = `inbox/${dateStr}-${timeStr}-${slug}.md`;

  const tagLine = tags.length > 0 ? `tags: [${tags.join(", ")}]\n` : "";
  const frontmatter = `---\ntitle: "${title}"\ndate: ${now.toISOString()}\n${tagLine}---\n\n`;
  await writeVaultNote(notePath, frontmatter + text);
  return notePath;
}

export async function indexVaultNote(params: {
  path: string;
  title: string;
  content: string;
  tags?: string[];
  frontmatter?: Record<string, unknown>;
}): Promise<void> {
  const { path: notePath, title, content, tags = [], frontmatter } = params;

  await prisma.vaultNote.upsert({
    where: { path: notePath },
    create: { path: notePath, title, content, tags, ...(frontmatter ? { frontmatter } : {}) },
    update: { title, content, tags, ...(frontmatter ? { frontmatter } : {}) },
  });

  try {
    const embedding = await embed(content.slice(0, 2000));
    const vectorStr = `[${embedding.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE vault_notes SET embedding = $1::vector WHERE path = $2`,
      vectorStr,
      notePath
    );
  } catch {
    // Embedding failure is non-fatal — note remains indexed without vector
  }
}
