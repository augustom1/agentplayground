/**
 * POST /api/admin/index-docs
 * Indexes all project documentation into the Brain for agent context.
 * Run after adding new docs or on first deploy.
 * Admin-only.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { ingestToBrain } from "@/lib/brain/ingest";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && process.env.CRON_SECRET) {
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }
  const session = await auth();
  return !!(session?.user && (session.user as { role?: string }).role === "admin");
}

// Docs to index relative to project root
const DOC_PATHS = [
  "CLAUDE.md",
  "HANDOFF.md",
  "docs/VISION.md",
  "docs/WALKTHROUGH.md",
  "docs/PLAN.md",
  "docs/PROTOCOLS.md",
  "docs/architecture.md",
  "docs/DEPLOY-PROTOCOL.md",
  "docs/SESSION-HISTORY.md",
];

// Directories to index recursively
const DOC_DIRS = [
  "docs/reports",
  "docs/ops",
  "docs/context",
  "docs/context/business",
  "docs/context/dev",
  "docs/context/agents",
  "docs/context/personal",
  "business",
  "business/delivery",
  "business/marketing",
];

const PROJECT_ROOT = process.cwd();

function collectMarkdownFiles(dir: string): string[] {
  const abs = path.join(PROJECT_ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f));
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return apiError("Admin access required", 403);

  const results: Array<{ path: string; status: "indexed" | "skipped" | "error"; docId?: string; error?: string }> = [];

  // Collect all doc paths
  const allPaths = [
    ...DOC_PATHS,
    ...DOC_DIRS.flatMap(collectMarkdownFiles),
  ];

  for (const relPath of allPaths) {
    const absPath = path.join(PROJECT_ROOT, relPath);

    if (!fs.existsSync(absPath)) {
      results.push({ path: relPath, status: "skipped" });
      continue;
    }

    try {
      const content = fs.readFileSync(absPath, "utf-8");
      if (!content.trim()) {
        results.push({ path: relPath, status: "skipped" });
        continue;
      }

      // Derive a human-readable title from filename
      const basename = path.basename(relPath, ".md");
      const title = basename
        .replace(/[-_]/g, " ")
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/\s+/g, " ");

      const docId = await ingestToBrain({
        content,
        title: `Docs: ${title}`,
        source: `docs:${relPath}`,
        sourceType: "manual",
        metadata: { filePath: relPath, indexedAt: new Date().toISOString() },
      });

      results.push({ path: relPath, status: "indexed", docId });
    } catch (err) {
      results.push({ path: relPath, status: "error", error: String(err) });
    }
  }

  const indexed = results.filter((r) => r.status === "indexed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors  = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    success: true,
    indexed,
    skipped,
    errors,
    results,
    message: `Indexed ${indexed} docs into Brain. ${skipped} skipped (unchanged or missing). ${errors} errors.`,
  });
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) return apiError("Admin access required", 403);

  // Return what would be indexed, without actually doing it
  const allPaths = [
    ...DOC_PATHS,
    ...DOC_DIRS.flatMap(collectMarkdownFiles),
  ];

  const files = allPaths.map((p) => ({
    path: p,
    exists: fs.existsSync(path.join(PROJECT_ROOT, p)),
    size: fs.existsSync(path.join(PROJECT_ROOT, p))
      ? fs.statSync(path.join(PROJECT_ROOT, p)).size
      : 0,
  }));

  return NextResponse.json({ files, total: files.length });
}
