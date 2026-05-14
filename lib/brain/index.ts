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
  tags: string[] = [],
  folder = "inbox"
): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "-");
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 40)
    .replace(/-+$/, "");
  const safeFolder = folder.replace(/\.\./g, "").replace(/^\//, "") || "inbox";
  const notePath = `${safeFolder}/${dateStr}-${timeStr}-${slug}.md`;

  const tagLine = tags.length > 0 ? `tags: [${tags.join(", ")}]\n` : "";
  const frontmatter = `---\ntitle: "${title}"\ndate: ${now.toISOString()}\n${tagLine}---\n\n`;
  await writeVaultNote(notePath, frontmatter + text);
  return notePath;
}

// ── Brain sync helpers ─────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

export async function initProjectBrain(
  projectId: string,
  projectName: string,
  description?: string
): Promise<string> {
  const slug = slugify(projectName);
  const notePath = `Projects/${slug}/README.md`;
  const content = `# ${projectName}\n\n${description || "No description provided."}\n\n**Project ID:** ${projectId}\n**Created:** ${new Date().toISOString()}\n\n---\n\n## Notes\n\n_Add project notes here._\n\n## Outputs\n\n_Agent outputs will appear here._\n`;
  await writeVaultNote(notePath, content);
  indexVaultNote({ path: notePath, title: projectName, content, tags: ["project", slug] }).catch(() => {});
  return notePath;
}

export async function initTeamBrain(
  teamId: string,
  teamName: string,
  description?: string
): Promise<string> {
  const slug = slugify(teamName);
  const notePath = `Teams/${slug}/README.md`;
  const content = `# Team: ${teamName}\n\n${description || "No description provided."}\n\n**Team ID:** ${teamId}\n**Created:** ${new Date().toISOString()}\n\n---\n\n## Mission\n\n_Define what this team is responsible for._\n\n## Work Log\n\n_Completed tasks and outputs appear here._\n`;
  await writeVaultNote(notePath, content);
  indexVaultNote({ path: notePath, title: `Team: ${teamName}`, content, tags: ["team", slug] }).catch(() => {});
  return notePath;
}

// Extract the first ISO/named date from text. Returns undefined if not found.
export function extractDate(text: string): Date | undefined {
  // ISO date like 2026-05-10 or 2026-05-10T14:30
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2})?)\b/);
  if (isoMatch) {
    const d = new Date(isoMatch[1]);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }
  // Named month like "May 10" or "May 10 2026"
  const namedMatch = text.match(
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i
  );
  if (namedMatch) {
    const year = namedMatch[3] ? parseInt(namedMatch[3]) : new Date().getFullYear();
    const d = new Date(`${namedMatch[1]} ${namedMatch[2]} ${year}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }
  // Relative: tomorrow, next week
  const now = new Date();
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); return d;
  }
  if (/\bnext week\b/i.test(text)) {
    const d = new Date(now); d.setDate(d.getDate() + 7); return d;
  }
  return undefined;
}

const SCHEDULE_TAGS = new Set(["task", "meeting", "event", "call", "deadline", "scheduled", "reminder"]);

export function isScheduledNote(tags: string[], text: string): boolean {
  return tags.some((t) => SCHEDULE_TAGS.has(t.toLowerCase().replace(/^#/, ""))) ||
    /\b(meeting|appointment|deadline|reminder|schedule[d]?|due|at \d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i.test(text);
}

// ── Team config sync ──────────────────────────────────────────────────────────

export async function saveTeamConfig(teamId: string): Promise<void> {
  const team = await prisma.agentTeam.findUnique({
    where: { id: teamId },
    include: { agents: true, skills: true, cliFunctions: true },
  });
  if (!team) return;

  const slug = slugify(team.name);
  const notePath = `Teams/${slug}/config.json`;

  const config = {
    teamId: team.id,
    name: team.name,
    description: team.description,
    port: team.port,
    language: team.language,
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
    agents: team.agents.map((a) => ({
      name: a.name,
      description: a.description,
      model: a.model,
      capabilities: a.capabilities,
      systemPrompt: a.systemPrompt,
      temperature: a.temperature,
      maxTokens: a.maxTokens,
    })),
    skills: team.skills.map((s) => ({
      name: s.name,
      description: s.description,
      category: s.category,
      instructions: s.instructions,
      examples: s.examples,
    })),
    cliFunctions: team.cliFunctions.map((f) => ({
      name: f.name,
      command: f.command,
      description: f.description,
      args: f.args,
      dangerous: f.dangerous,
    })),
  };

  await writeVaultNote(notePath, JSON.stringify(config, null, 2));

  // Index with a plain-text summary so it's semantically searchable
  const summary = [
    `Team: ${team.name}`,
    team.description,
    `Agents: ${team.agents.map((a) => a.name).join(", ") || "none"}`,
    `Skills: ${team.skills.map((s) => s.name).join(", ") || "none"}`,
  ].filter(Boolean).join(". ");

  indexVaultNote({
    path: notePath,
    title: `Team Config: ${team.name}`,
    content: summary,
    tags: ["team-config", `team:${slug}`],
  }).catch(() => {});
}

export async function syncTeamFromConfig(
  config: Record<string, unknown>
): Promise<{ agents: number; skills: number; cliFunctions: number }> {
  const teamId = config.teamId as string;
  if (!teamId) throw new Error("config.teamId is required");

  await prisma.agentTeam.update({
    where: { id: teamId },
    data: {
      name: config.name as string,
      description: (config.description as string) ?? "",
      port: (config.port as number) ?? 8000,
      language: (config.language as string) ?? "Python / FastAPI",
    },
  });

  const agents = (config.agents as Record<string, unknown>[]) ?? [];
  await prisma.agent.deleteMany({ where: { teamId } });
  for (const a of agents) {
    await prisma.agent.create({
      data: {
        name: a.name as string,
        description: (a.description as string) ?? null,
        model: (a.model as string) ?? "claude-sonnet-4-6",
        capabilities: (a.capabilities as string[]) ?? [],
        systemPrompt: (a.systemPrompt as string) ?? null,
        temperature: (a.temperature as number) ?? 0.7,
        maxTokens: (a.maxTokens as number) ?? 4096,
        teamId,
      },
    });
  }

  const skills = (config.skills as Record<string, unknown>[]) ?? [];
  await prisma.skill.deleteMany({ where: { teamId } });
  for (const s of skills) {
    await prisma.skill.create({
      data: {
        name: s.name as string,
        description: (s.description as string) ?? "",
        category: (s.category as string) ?? "general",
        instructions: (s.instructions as string) ?? null,
        examples: (s.examples as string) ?? null,
        teamId,
      },
    });
  }

  const cliFunctions = (config.cliFunctions as Record<string, unknown>[]) ?? [];
  await prisma.cliFunction.deleteMany({ where: { teamId } });
  for (const f of cliFunctions) {
    await prisma.cliFunction.create({
      data: {
        name: f.name as string,
        command: f.command as string,
        description: (f.description as string) ?? null,
        args: (f.args as Record<string, unknown>) ?? null,
        dangerous: (f.dangerous as boolean) ?? false,
        teamId,
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      action: `Synced team "${config.name}" from Brain config.json`,
      type: "import",
      teamName: config.name as string,
      teamId,
    },
  }).catch(() => {});

  // Re-save the config so updatedAt reflects the sync time
  await saveTeamConfig(teamId);

  return { agents: agents.length, skills: skills.length, cliFunctions: cliFunctions.length };
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
