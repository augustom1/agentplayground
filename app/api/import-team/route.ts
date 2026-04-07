export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/import-team — import an agent team from JSON config
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Validate required fields
  if (!body.name) {
    return NextResponse.json({ error: "Missing team name" }, { status: 400 });
  }

  // Save the config to the registry
  const config = await prisma.agentTeamConfig.create({
    data: {
      name: body.name,
      description: body.description ?? null,
      version: body.version ?? "1.0.0",
      author: body.author ?? null,
      configJson: body,
      sourceUrl: body.sourceUrl ?? null,
    },
  });

  // Create the actual team from the config
  const team = await prisma.agentTeam.create({
    data: {
      name: body.name,
      description: body.description ?? "",
      port: body.port ?? 8000,
      language: body.language ?? "Python / FastAPI",
      config: body.config ?? null,
      isImported: true,
      sourceUrl: body.sourceUrl ?? null,
    },
  });

  // Import agents if provided
  if (body.agents && Array.isArray(body.agents)) {
    for (const agent of body.agents) {
      await prisma.agent.create({
        data: {
          name: agent.name,
          description: agent.description ?? null,
          model: agent.model ?? "claude-sonnet-4-6",
          capabilities: agent.capabilities ?? [],
          systemPrompt: agent.systemPrompt ?? null,
          temperature: agent.temperature ?? 0.7,
          maxTokens: agent.maxTokens ?? 4096,
          teamId: team.id,
        },
      });
    }
  }

  // Import skills if provided
  if (body.skills && Array.isArray(body.skills)) {
    for (const skill of body.skills) {
      await prisma.skill.create({
        data: {
          name: skill.name,
          description: skill.description ?? "",
          category: skill.category ?? "general",
          instructions: skill.instructions ?? null,
          examples: skill.examples ?? null,
          teamId: team.id,
        },
      });
    }
  }

  // Import CLI functions if provided
  if (body.cliFunctions && Array.isArray(body.cliFunctions)) {
    for (const fn of body.cliFunctions) {
      await prisma.cliFunction.create({
        data: {
          name: fn.name,
          command: fn.command,
          description: fn.description ?? null,
          args: fn.args ?? null,
          dangerous: fn.dangerous ?? false,
          teamId: team.id,
        },
      });
    }
  }

  // Log the import activity
  await prisma.activityLog.create({
    data: {
      action: `Imported agent team "${body.name}"`,
      type: "import",
      teamName: body.name,
      teamId: team.id,
    },
  });

  return NextResponse.json({ config, team }, { status: 201 });
}
