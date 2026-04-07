export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/export-team/:id — export a team as JSON config
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const team = await prisma.agentTeam.findUnique({
    where: { id },
    include: {
      agents: true,
      skills: true,
      cliFunctions: true,
    },
  });

  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const exportConfig = {
    name: team.name,
    description: team.description,
    port: team.port,
    language: team.language,
    config: team.config,
    version: "1.0.0",
    exportedAt: new Date().toISOString(),
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

  // Log the export activity
  await prisma.activityLog.create({
    data: {
      action: `Exported agent team "${team.name}"`,
      type: "export",
      teamName: team.name,
      teamId: team.id,
    },
  });

  return NextResponse.json(exportConfig);
}
