export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/tools — aggregate skills, CLI functions, and improvements
export async function GET() {
  try {
    const [skills, cliFunctions, improvements] = await Promise.all([
      prisma.skill.findMany({
        orderBy: [{ category: "asc" }, { name: "asc" }],
        include: { team: { select: { id: true, name: true } } },
      }),
      prisma.cliFunction.findMany({
        orderBy: { createdAt: "desc" },
        include: { team: { select: { id: true, name: true } } },
      }),
      prisma.improvement.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    // Group skills by category for easy rendering
    const skillsByCategory = skills.reduce(
      (acc, skill) => {
        const cat = skill.category || "general";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(skill);
        return acc;
      },
      {} as Record<string, typeof skills>
    );

    return NextResponse.json({
      skills,
      skillsByCategory,
      cliFunctions,
      improvements,
      stats: {
        totalSkills: skills.length,
        totalCliFunctions: cliFunctions.length,
        totalImprovements: improvements.length,
        appliedImprovements: improvements.filter((i) => i.applied).length,
        highImpact: improvements.filter((i) => i.impact === "high" && !i.applied).length,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
