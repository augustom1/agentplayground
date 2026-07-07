export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

type ConvMessage = { role: "user" | "assistant"; content: string };

type PlaygroundConfig = {
  name: string;
  icon: string | null;
  description: string;
  suggestedTeamIds: string[];
  suggestedBrainTags: string[];
  newTeamsNeeded: { name: string; role: string; description: string }[];
};

const SYSTEM_PROMPT = `You are a Playground Setup Assistant for AgentPlayground. Your ONLY job is to help the user create a new Playground.

A Playground is a self-contained workspace that groups agent teams and scoped brain knowledge.

## Your Process
1. When the user describes their intent, call list_teams to see what teams exist
2. Then call suggest_playground_config with the user's intent to generate a proposed configuration
3. Present the proposed config to the user in a friendly, concise way — name, icon, which teams will be included, what brain tags will be applied
4. Ask for confirmation before creating
5. When they confirm ("looks good", "yes", "create it"), call create_playground_from_config

## Rules
- Be concise and friendly — one short paragraph max per response
- Always call list_teams before suggest_playground_config
- Present the config clearly but briefly
- Don't ask many clarifying questions — propose something and let them refine
- After create_playground_from_config succeeds, just say "Done! Your [name] playground is ready." and nothing else`;

async function getApiKey(): Promise<string | undefined> {
  const envVal = process.env.ANTHROPIC_API_KEY;
  if (envVal) return envVal;
  const mem = await prisma.agentMemory.findFirst({
    where: { ownerType: "system", ownerId: "ANTHROPIC_API_KEY" },
    select: { content: true },
  });
  return mem?.content ?? undefined;
}

async function executePlaygroundTool(
  toolName: string,
  input: Record<string, unknown>,
  userId: string,
  apiKey: string
): Promise<{ result: string; proposedConfig?: PlaygroundConfig; done?: boolean; playgroundId?: string; playgroundName?: string }> {

  if (toolName === "list_teams") {
    const teams = await prisma.agentTeam.findMany({
      where: { isSystemTeam: false },
      include: { _count: { select: { agents: true } } },
      orderBy: { createdAt: "asc" },
    });
    const result = teams.map(t => ({ id: t.id, name: t.name, agentCount: t._count.agents }));
    return { result: JSON.stringify(result) };
  }

  if (toolName === "suggest_playground_config") {
    const userIntent = input.userIntent as string;
    const teams = await prisma.agentTeam.findMany({
      where: { isSystemTeam: false },
      select: { id: true, name: true, description: true },
    });

    const configClient = new Anthropic({ apiKey });
    const configMsg = await configClient.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `You generate playground configurations as JSON. Return ONLY valid JSON matching this schema exactly:
{
  "name": "short descriptive playground name",
  "icon": "single relevant emoji",
  "description": "one sentence",
  "suggestedTeamIds": ["only IDs from the provided teams list that fit the intent"],
  "suggestedBrainTags": ["2-4 lowercase tag strings"],
  "newTeamsNeeded": [{"name": "string", "role": "string", "description": "string"}]
}
Only include teams whose purpose genuinely matches the intent. newTeamsNeeded should be empty if existing teams cover the need.`,
      messages: [{
        role: "user",
        content: `User intent: "${userIntent}"\n\nExisting teams:\n${JSON.stringify(teams, null, 2)}\n\nReturn JSON:`,
      }],
    });

    const text = configMsg.content[0].type === "text" ? configMsg.content[0].text : "{}";
    let config: PlaygroundConfig;
    try {
      const cleaned = text.trim().replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, "");
      config = JSON.parse(cleaned) as PlaygroundConfig;
    } catch {
      config = {
        name: "New Playground",
        icon: null,
        description: userIntent,
        suggestedTeamIds: [],
        suggestedBrainTags: [],
        newTeamsNeeded: [],
      };
    }

    return { result: JSON.stringify(config), proposedConfig: config };
  }

  if (toolName === "create_playground_from_config") {
    const name = input.name as string;
    const icon = (input.icon as string) ?? null;
    const teamIds = (input.teamIds as string[]) ?? [];
    const brainTags = (input.brainTags as string[]) ?? [];
    const newTeams = (input.newTeams as { name: string; role: string; description: string }[]) ?? [];

    const allTeamIds = [...teamIds];

    for (const nt of newTeams) {
      const lastTeam = await prisma.agentTeam.findFirst({
        orderBy: { port: "desc" },
        select: { port: true },
      });
      const nextPort = (lastTeam?.port ?? 8100) + 1;

      const team = await prisma.agentTeam.create({
        data: {
          name: nt.name,
          description: nt.description,
          port: nextPort,
          status: "active",
          isSystemTeam: false,
        },
      });
      await prisma.agent.create({
        data: {
          teamId: team.id,
          name: `${nt.name} Coordinator`,
          description: nt.role,
          model: "claude-sonnet-4-6",
          capabilities: ["coordination", "planning"],
          systemPrompt: `You are the coordinator for the ${nt.name} team. ${nt.description}`,
        },
      });
      allTeamIds.push(team.id);
    }

    const pg = await prisma.playground.create({
      data: { name, icon, teamIds: allTeamIds, brainTags, userId },
    });

    return {
      result: JSON.stringify({ playgroundId: pg.id, playgroundName: pg.name }),
      done: true,
      playgroundId: pg.id,
      playgroundName: pg.name,
    };
  }

  return { result: "Unknown tool" };
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: "list_teams",
    description: "List all existing agent teams with their name and agent count.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "suggest_playground_config",
    description: "Generate a proposed playground configuration based on the user's intent and existing teams.",
    input_schema: {
      type: "object",
      properties: {
        userIntent: { type: "string", description: "What the user wants to use the playground for" },
      },
      required: ["userIntent"],
    },
  },
  {
    name: "create_playground_from_config",
    description: "Create the playground once the user has confirmed the configuration.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Playground name" },
        icon: { type: "string", description: "Emoji icon" },
        teamIds: { type: "array", items: { type: "string" }, description: "IDs of existing teams to include" },
        brainTags: { type: "array", items: { type: "string" }, description: "Brain scope tags" },
        newTeams: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              description: { type: "string" },
            },
          },
          description: "New teams to create (empty if existing teams suffice)",
        },
      },
      required: ["name", "teamIds", "brainTags"],
    },
  },
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  const userId = session.user.id;

  const { messages, confirmedConfig } = await req.json() as {
    messages: ConvMessage[];
    confirmedConfig?: PlaygroundConfig;
  };

  const apiKey = await getApiKey();
  if (!apiKey) return apiError("Anthropic API key not configured. Go to Settings → API Keys.", 503);

  // Shortcut: user confirmed, skip LLM and create directly
  if (confirmedConfig) {
    try {
      const execResult = await executePlaygroundTool(
        "create_playground_from_config",
        {
          name: confirmedConfig.name,
          icon: confirmedConfig.icon,
          teamIds: confirmedConfig.suggestedTeamIds,
          brainTags: confirmedConfig.suggestedBrainTags,
          newTeams: confirmedConfig.newTeamsNeeded,
        },
        userId,
        apiKey
      );
      return NextResponse.json({
        text: `Done! Your **${confirmedConfig.name}** playground is ready.`,
        done: true,
        playgroundId: execResult.playgroundId,
        playgroundName: execResult.playgroundName,
      });
    } catch (err) {
      console.error("create_playground_from_config failed:", err);
      return apiError("Failed to create playground", 500);
    }
  }

  // Normal LLM conversation loop
  const client = new Anthropic({ apiKey });
  const anthropicMessages: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  let finalText = "";
  let proposedConfig: PlaygroundConfig | undefined;
  let done = false;
  let playgroundId: string | undefined;
  let playgroundName: string | undefined;

  for (let i = 0; i < 6; i++) {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: anthropicMessages,
    });

    const textBlocks = resp.content.filter(b => b.type === "text");
    if (textBlocks.length > 0) {
      finalText = textBlocks.map(b => (b.type === "text" ? b.text : "")).join("");
    }

    if (resp.stop_reason !== "tool_use") break;

    anthropicMessages.push({ role: "assistant", content: resp.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of resp.content) {
      if (block.type !== "tool_use") continue;

      const execResult = await executePlaygroundTool(
        block.name,
        block.input as Record<string, unknown>,
        userId,
        apiKey
      );

      if (execResult.proposedConfig) proposedConfig = execResult.proposedConfig;
      if (execResult.done) {
        done = true;
        playgroundId = execResult.playgroundId;
        playgroundName = execResult.playgroundName;
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: execResult.result,
      });
    }

    anthropicMessages.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({ text: finalText, proposedConfig, done, playgroundId, playgroundName });
}
