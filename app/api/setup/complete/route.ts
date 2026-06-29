import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { seedTeams } from "@/lib/seed-teams";
import { seedPersonalTeams } from "@/lib/seed-personal-teams";
import { seedDefaults } from "@/lib/seed-defaults";
import { seedDefaultPlaygrounds } from "@/lib/seed-playgrounds";

export const dynamic = "force-dynamic";

const PERSONAL_ALL = ["cv_advisory", "education", "financial", "job_search", "fitness"];

async function saveApiKey(keyName: string, value: string) {
  const existing = await prisma.agentMemory.findFirst({
    where: { ownerType: "system", ownerId: keyName },
    select: { id: true },
  });
  if (existing) {
    await prisma.agentMemory.update({
      where: { id: existing.id },
      data: { content: value, accessedAt: new Date() },
    });
  } else {
    await prisma.agentMemory.create({
      data: {
        ownerType:  "system",
        ownerId:    keyName,
        content:    value,
        memoryType: "preference",
        tenantId:   "default",
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);

    const body = await req.json() as {
      apiKeys?: { openai?: string; anthropic?: string };
      starterPack?: string;
    };

    const { apiKeys = {}, starterPack = "blank" } = body;

    // Save API keys to AgentMemory
    if (apiKeys.openai?.trim())    await saveApiKey("OPENAI_API_KEY",    apiKeys.openai.trim());
    if (apiKeys.anthropic?.trim()) await saveApiKey("ANTHROPIC_API_KEY", apiKeys.anthropic.trim());

    // Save starter pack selection for coordinator context
    await prisma.agentMemory.create({
      data: {
        ownerType:  "system",
        ownerId:    "config",
        content:    `starter_pack: ${starterPack}`,
        memoryType: "preference",
        importance: 0.8,
        tenantId:   "default",
      },
    }).catch(() => {}); // non-fatal if duplicate

    // Seed teams based on starter selection (fire-and-forget, non-blocking)
    const runSeed = async () => {
      await seedDefaults().catch(console.error);
      if (starterPack === "personal") {
        await seedTeams().catch(console.error);
        await seedPersonalTeams(PERSONAL_ALL).catch(console.error);
      } else if (starterPack === "business" || starterPack === "development") {
        await seedTeams().catch(console.error);
      }
      // blank — no pre-seeded teams, user builds from scratch
      await seedDefaultPlaygrounds(session.user.id).catch(console.error);
    };
    runSeed().catch(console.error);

    // Set setup_complete cookie — permanent, expires in 1 year
    const res = NextResponse.json({ success: true });
    res.cookies.set("setup_complete", "1", {
      path:     "/",
      maxAge:   31536000,
      httpOnly: true,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    return apiError(err);
  }
}
