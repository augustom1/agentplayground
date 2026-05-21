export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string; threadId: string }> };

type Message = {
  role: "user" | "assistant";
  content: string;
  agentId?: string;
  agentName?: string;
};

type TeamConfig = {
  systemPrompt?: string;
  routingRules?: string;
  responseStyle?: "individual" | "synthesized";
};

type AgentInfo = {
  id: string;
  name: string;
  model: string;
  description: string | null;
  systemPrompt: string | null;
  role: string | null;
};

// Build routing prompt for the coordinator
function buildRoutingPrompt(team: { name: string; config: TeamConfig }, agents: AgentInfo[], userMessage: string): string {
  const agentList = agents
    .map((a, i) => `${i + 1}. [${a.name}] (id: ${a.id})${a.role ? ` — role: ${a.role}` : ""}${a.description ? ` — ${a.description}` : ""}`)
    .join("\n");

  return `You are the coordinator for team "${team.name}". Given a user message and the available team members, decide which agent(s) should respond.

## Team Members
${agentList}

${team.config.routingRules ? `## Routing Rules\n${team.config.routingRules}\n` : ""}
## Instructions
- Return a JSON array of agent IDs that should respond, e.g. ["id1"] or ["id1", "id2"]
- Pick 1 agent for simple questions, 2-3 for multi-domain tasks
- If no specific agent fits, pick the most general one
- Return ONLY the JSON array, no other text

User message: "${userMessage}"`;
}

async function routeMessage(team: { name: string; config: TeamConfig }, agents: AgentInfo[], userMessage: string): Promise<AgentInfo[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || agents.length === 0) return agents.slice(0, 1);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: buildRoutingPrompt(team, agents, userMessage) }],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return agents.slice(0, 1);
    const selectedIds: string[] = JSON.parse(match[0]);
    const selected = agents.filter((a) => selectedIds.includes(a.id));
    return selected.length > 0 ? selected : agents.slice(0, 1);
  } catch {
    return agents.slice(0, 1);
  }
}

async function callAgent(
  agent: AgentInfo,
  team: { name: string; config: TeamConfig },
  history: Message[],
  userMessage: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return `[${agent.name}]: No API key configured.`;

  const systemPrompt = [
    agent.systemPrompt ?? `You are ${agent.name}.`,
    team.config.systemPrompt ? `\n\nTeam context: ${team.config.systemPrompt}` : "",
    `\n\nYou are part of the "${team.name}" team. Respond as ${agent.name}${agent.role ? ` (${agent.role})` : ""}.`,
  ].join("");

  const historyMessages = history.slice(-10).map((m) => ({
    role: m.role,
    content: m.agentName ? `[${m.agentName}]: ${m.content}` : m.content,
  }));

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: agent.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [...historyMessages, { role: "user", content: userMessage }],
    });
    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    return text;
  } catch (err) {
    return `[${agent.name}]: Error — ${err instanceof Error ? err.message : "Unknown error"}`;
  }
}

// POST /api/playground/teams/[id]/threads/[threadId]/messages
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id, threadId } = await params;

    const team = await prisma.playgroundTeam.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            agent: {
              select: {
                id: true, name: true, model: true,
                description: true, systemPrompt: true,
              },
            },
          },
        },
      },
    });

    if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (team.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const thread = await prisma.playgroundThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.teamId !== id) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

    const body = await req.json();
    const userMessage: string = body.content;
    if (!userMessage?.trim()) return NextResponse.json({ error: "Missing content" }, { status: 400 });

    const history = (thread.messages as Message[]) ?? [];
    const config = (team.config as TeamConfig) ?? {};
    const agents: AgentInfo[] = team.members.map((m) => ({
      ...m.agent,
      role: m.role,
    }));

    // Append user message to history
    const updatedHistory: Message[] = [
      ...history,
      { role: "user", content: userMessage },
    ];

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Route to appropriate agents
          const selectedAgents = await routeMessage({ name: team.name, config }, agents, userMessage);
          const responseStyle = config.responseStyle ?? "individual";
          const responses: { agent: AgentInfo; text: string }[] = [];

          if (responseStyle === "individual" || selectedAgents.length === 1) {
            for (const agent of selectedAgents) {
              controller.enqueue(encoder.encode(`**[${agent.name}]**\n\n`));
              const text = await callAgent(agent, { name: team.name, config }, history, userMessage);
              controller.enqueue(encoder.encode(text));
              if (selectedAgents.indexOf(agent) < selectedAgents.length - 1) {
                controller.enqueue(encoder.encode("\n\n---\n\n"));
              }
              responses.push({ agent, text });
            }
          } else {
            // Synthesized: call all agents then summarize
            for (const agent of selectedAgents) {
              const text = await callAgent(agent, { name: team.name, config }, history, userMessage);
              responses.push({ agent, text });
            }
            const synthesized = responses
              .map((r) => `**[${r.agent.name}${r.agent.role ? ` — ${r.agent.role}` : ""}]**\n\n${r.text}`)
              .join("\n\n---\n\n");
            controller.enqueue(encoder.encode(synthesized));
          }

          // Build assistant reply for storage
          const assistantContent = responses
            .map((r) => `[${r.agent.name}]: ${r.text}`)
            .join("\n\n");
          const primaryAgent = responses[0]?.agent;

          // Save updated thread
          const finalHistory: Message[] = [
            ...updatedHistory,
            {
              role: "assistant",
              content: assistantContent,
              agentId: primaryAgent?.id,
              agentName: primaryAgent?.name,
            },
          ];

          await prisma.playgroundThread.update({
            where: { id: threadId },
            data: {
              messages: finalHistory,
              title: thread.title ?? userMessage.slice(0, 60),
            },
          });
        } catch (err) {
          controller.enqueue(encoder.encode(`\n\nError: ${err instanceof Error ? err.message : "Unknown error"}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
