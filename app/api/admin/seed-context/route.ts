/**
 * POST /api/admin/seed-context
 * Seeds brain context documents (business-setup, personal-profile, education-goals, platform-operations)
 * into the Brain knowledge base, then creates initial pending action items for the coordinator.
 * Run once after first deploy, safe to re-run (deduplicates automatically).
 * Admin-only.
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { ingestToBrain } from "@/lib/brain/ingest";
import { prisma } from "@/lib/prisma";

const ROOT = process.cwd();

const CONTEXT_DOCS = [
  { file: "docs/context/business-setup.md",      title: "Business Setup Context",       sourceType: "manual" },
  { file: "docs/context/personal-profile.md",    title: "Personal Profile — Augusto",   sourceType: "manual" },
  { file: "docs/context/education-goals.md",     title: "Education Goals & Roadmap",    sourceType: "manual" },
  { file: "docs/context/platform-operations.md", title: "Platform Operations Context",  sourceType: "manual" },
];

const INITIAL_ACTIONS = [
  {
    title: "Provide professional summary for CV",
    description: "The CV Builder needs your professional summary (2–3 sentences): who you are, what you build, what makes you different. Go to /cv → Professional Summary → Add.",
    category: "cv",
    priority: "high",
  },
  {
    title: "Add work experience to CV",
    description: "List your previous jobs or notable projects. For each: Company | Role | Dates | Key achievements. Go to /cv → Work Experience → Add.",
    category: "cv",
    priority: "high",
  },
  {
    title: "Provide ARQ account + crypto billing preferences",
    description: "For the crypto billing system, the business team needs: (1) Your ARQ account address or exchange, (2) Preferred chain for receiving payments (TRC20/Polygon/BSC), (3) Auto-transfer threshold, (4) Manual or auto approval per transfer. Reply in Chat to fill this in.",
    category: "business",
    priority: "high",
  },
  {
    title: "Confirm Monotributo category + billing currency",
    description: "The business team needs your Monotributo category (service type), whether you bill in ARS only or ARS+USD, and your current monthly cap. Reply in Chat or go to Notes → Business to dump this.",
    category: "business",
    priority: "normal",
  },
  {
    title: "Set learning goals: time per week + preferred format",
    description: "The Education team needs to know: (1) How many hours per week you can dedicate to learning, (2) Preferred format (video / articles / projects / interactive), (3) Any in-progress courses or certifications. Go to /learn to add topics, or reply in Chat.",
    category: "education",
    priority: "normal",
  },
  {
    title: "Add technical skills to CV",
    description: "Go to /cv → Technical Skills → Add. Include languages, frameworks, tools, platforms. The CV Advisory team will format and group them for you.",
    category: "cv",
    priority: "normal",
  },
  {
    title: "Run overnight knowledge build",
    description: "Go to /admin/system → 'Run Overnight Tasks' to have the local AI (qwen2.5:7b) analyze the codebase and write business docs. Do this once before asking agents to work on code documentation.",
    category: "technical",
    priority: "normal",
  },
  {
    title: "Index all docs into Brain",
    description: "Go to /admin/system → 'Index Docs Now' to populate the Brain with all project documentation. This gives agents full context about the platform when they work.",
    category: "technical",
    priority: "normal",
  },
];

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  if (session.user.role !== "admin") return apiError("Forbidden", 403);

  const results: { file: string; status: string; docId?: string }[] = [];

  // Index context docs
  for (const doc of CONTEXT_DOCS) {
    const filePath = path.join(ROOT, doc.file);
    if (!fs.existsSync(filePath)) {
      results.push({ file: doc.file, status: "missing" });
      continue;
    }
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const docId = await ingestToBrain({
        content,
        title: doc.title,
        source: `context:${doc.file}`,
        sourceType: doc.sourceType,
        metadata: { contextFile: doc.file },
      });
      results.push({ file: doc.file, status: docId ? "indexed" : "skipped", docId: docId || undefined });
    } catch (err) {
      results.push({ file: doc.file, status: "error" });
      console.error(`[seed-context] Error indexing ${doc.file}:`, err);
    }
  }

  // Create pending actions (skip duplicates by title)
  const existingTitles = new Set(
    (await prisma.pendingAction.findMany({ select: { title: true } })).map((a) => a.title)
  );

  const created: string[] = [];
  for (const action of INITIAL_ACTIONS) {
    if (existingTitles.has(action.title)) continue;
    await prisma.pendingAction.create({ data: action });
    created.push(action.title);
  }

  return NextResponse.json({
    docs: results,
    actionsCreated: created.length,
    actionsSkipped: INITIAL_ACTIONS.length - created.length,
    message: `Context seeded: ${results.filter((r) => r.status === "indexed").length} docs indexed, ${created.length} action items created.`,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  if (session.user.role !== "admin") return apiError("Forbidden", 403);

  return NextResponse.json({
    contextDocs: CONTEXT_DOCS.map((d) => ({ file: d.file, exists: fs.existsSync(path.join(ROOT, d.file)) })),
    initialActions: INITIAL_ACTIONS.map((a) => ({ title: a.title, category: a.category, priority: a.priority })),
  });
}
