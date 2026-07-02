/**
 * POST /api/auth/setup — first-run admin account + onboarding configuration.
 * Only works when 0 users exist. Disabled automatically once any user is created.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { seedDefaults } from "@/lib/seed-defaults";
import { seedTeams } from "@/lib/seed-teams";
import { seedPersonalTeams } from "@/lib/seed-personal-teams";

type UseCase = "personal_os" | "business_platform" | "client_hosting" | "ai_lab";
type DataRetention = "full" | "results_only" | "minimal";
type LlmPreference = "ollama" | "claude" | "mixed";

// Which seed groups to run per use case (in addition to always-seeding Command Center)
const USE_CASE_SEEDS: Record<UseCase, string[]> = {
  personal_os:       ["personal"],
  business_platform: ["business"],
  client_hosting:    ["business", "dev"],
  ai_lab:            ["dev"],
};

// GET — check if setup is still needed
export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (err) {
    return apiError(err);
  }
}

// POST — create first admin + run onboarding
export async function POST(req: NextRequest) {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      return apiError("Setup already complete. Use the admin panel to create users.", 403);
    }

    const body = await req.json() as {
      email: string;
      password: string;
      name?: string;
      useCase?: UseCase;
      selectedTeams?: string[];
      dataRetention?: DataRetention;
      llmPref?: LlmPreference;
    };

    if (!body.email)    return apiError("Missing required field: email", 400);
    if (!body.password) return apiError("Missing required field: password", 400);
    if (body.password.length < 8) return apiError("Password must be at least 8 characters", 400);

    const useCase:       UseCase       = body.useCase       ?? "personal_os";
    const dataRetention: DataRetention = body.dataRetention ?? "full";
    const llmPref:       LlmPreference = body.llmPref       ?? "mixed";
    const selectedTeams: string[]      = body.selectedTeams ?? ["command_center"];

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email:        body.email.toLowerCase().trim(),
        name:         body.name ?? null,
        passwordHash,
        role:         "admin",
        plan:         "pro",
      },
      select: { id: true, email: true, name: true, role: true, plan: true },
    });

    await prisma.userCredits.create({
      data: { userId: user.id, balance: 5000, lifetimePurchased: 0, lifetimeUsed: 0 },
    });

    // Save system config to AgentMemory so coordinator can read it
    await prisma.agentMemory.createMany({
      data: [
        {
          ownerType: "system",
          ownerId: "config",
          content: `use_case: ${useCase}`,
          memoryType: "preference",
          importance: 1.0,
        },
        {
          ownerType: "system",
          ownerId: "config",
          content: `data_retention: ${dataRetention}`,
          memoryType: "preference",
          importance: 1.0,
        },
        {
          ownerType: "system",
          ownerId: "config",
          content: `llm_preference: ${llmPref}`,
          memoryType: "preference",
          importance: 1.0,
        },
        {
          ownerType: "system",
          ownerId: "config",
          content: `selected_teams: ${selectedTeams.join(", ")}`,
          memoryType: "preference",
          importance: 0.8,
        },
      ],
    });

    // Seed in background — non-blocking
    const seedGroup = USE_CASE_SEEDS[useCase] ?? [];
    Promise.all([
      seedDefaults(),
      // Always seed the core teams
      seedTeams(),
      // Seed personal teams if requested
      (seedGroup.includes("personal") || selectedTeams.some((t) => ["cv_advisory", "education", "financial", "job_search", "fitness"].includes(t)))
        ? seedPersonalTeams(selectedTeams)
        : Promise.resolve(),
      // Index docs into Brain after seeding
      indexDocsBackground(),
    ]).catch((e) => console.error("[setup] Background seeding failed:", e));

    return NextResponse.json({ success: true, user, config: { useCase, dataRetention, llmPref } }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

// Fire-and-forget doc indexing on first setup
async function indexDocsBackground(): Promise<void> {
  try {
    const { ingestToBrain } = await import("@/lib/brain/ingest");
    const fs = (await import("fs")).default;
    const path = (await import("path")).default;

    const root = process.cwd();
    const files = [
      "CLAUDE.md", "HANDOFF.md",
      "docs/VISION.md", "docs/WALKTHROUGH.md",
      "docs/PLAN.md", "docs/PROTOCOLS.md", "docs/architecture.md", "docs/DEPLOY-PROTOCOL.md",
    ];

    for (const rel of files) {
      const abs = path.join(root, rel);
      if (!fs.existsSync(abs)) continue;
      const content = fs.readFileSync(abs, "utf-8");
      if (!content.trim()) continue;
      const title = path.basename(rel, ".md").replace(/[-_]/g, " ");
      await ingestToBrain({
        content,
        title: `Docs: ${title}`,
        source: `docs:${rel}`,
        sourceType: "manual",
        metadata: { filePath: rel },
      }).catch(() => {});
    }
  } catch {
    // Non-fatal — Brain population is best-effort at setup time
  }
}
