export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import http from "http";
import https from "https";
import { URL } from "url";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { getEffectiveApiKey } from "@/lib/api-keys";
import { getAvailableProvider, defaultModelFor } from "@/lib/providers";
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

// ── Ollama helper ─────────────────────────────────────────────────────────────

function httpPost(urlStr: string, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parseInt(parsed.port || (isHttps ? "443" : "80")),
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        Connection: "close",
      },
    };
    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      res.on("end", () => resolve(data));
    });
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("Ollama timeout")); });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ── Routing ───────────────────────────────────────────────────────────────────

function buildRoutingPrompt(team: { name: string; config: TeamConfig }, agents: AgentInfo[], userMessage: string): string {
  const agentList = agents
    .map((a, i) => `${i + 1}. [${a.name}] (id: ${a.id})${a.role ? ` — role: ${a.role}` : ""}${a.description ? ` — ${a.description}` : ""}`)
    .join("\n");

  return `You are the coordinator for team "${team.name}". Given a user message and the available team members, decide which agent(s) should respond.

## Team Members
${agentList}

${team.config.routingRules ? `## Routing Rules\n${team.config.routingRules}\n` : ""}## Instructions
- Return a JSON array of agent IDs that should respond, e.g. ["id1"] or ["id1", "id2"]
- Pick 1 agent for simple questions, 2-3 for multi-domain tasks
- If no specific agent fits, pick the most general one
- Return ONLY the JSON array, no other text

User message: "${userMessage}"`;
}

async function routeMessage(team: { name: string; config: TeamConfig }, agents: AgentInfo[], userMessage: string): Promise<AgentInfo[]> {
  const apiKey = await getEffectiveApiKey("ANTHROPIC_API_KEY");
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

// ── Agent call — Anthropic ────────────────────────────────────────────────────

async function callAnthropic(
  agent: AgentInfo,
  team: { name: string; config: TeamConfig },
  history: Message[],
  userMessage: string,
  model: string,
  fileContext?: string,
): Promise<string> {
  const systemPrompt = [
    agent.systemPrompt ?? `You are ${agent.name}.`,
    team.config.systemPrompt ? `\n\nTeam context: ${team.config.systemPrompt}` : "",
    `\n\nYou are part of the "${team.name}" team. Respond as ${agent.name}${agent.role ? ` (${agent.role})` : ""}.`,
    fileContext ? `\n\n---\nDocument shared by user:\n${fileContext}` : "",
  ].join("");

  const historyMessages = history.slice(-10).map((m) => ({
    role: m.role,
    content: m.agentName ? `[${m.agentName}]: ${m.content}` : m.content,
  }));

  const apiKey = await getEffectiveApiKey("ANTHROPIC_API_KEY");
  if (!apiKey) {
    // Free-tier fallback: NVIDIA / OpenAI / local Ollama via the provider abstraction
    const provider = await getAvailableProvider();
    if (!provider) return `[${agent.name}]: No AI provider available. Add an API key in Settings > API Keys (Anthropic, or NVIDIA's free key), or start Ollama.`;
    try {
      const result = await provider.complete({
        model: defaultModelFor(provider),
        messages: [...historyMessages, { role: "user" as const, content: userMessage }],
        system: systemPrompt,
        maxTokens: 2048,
      });
      return result.content || "";
    } catch (err) {
      return `[${agent.name}]: Error — ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
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

// ── Agent call — Ollama ───────────────────────────────────────────────────────

async function callOllama(
  agent: AgentInfo,
  team: { name: string; config: TeamConfig },
  history: Message[],
  userMessage: string,
  model: string,
  fileContext?: string,
): Promise<string> {
  const systemPrompt = [
    agent.systemPrompt ?? `Sos ${agent.name}.`,
    team.config.systemPrompt ? `\n\nContexto del equipo: ${team.config.systemPrompt}` : "",
    `\n\nSos parte del equipo "${team.name}". Respondé como ${agent.name}${agent.role ? ` (${agent.role})` : ""}.`,
    fileContext ? `\n\n---\nDocumento compartido por el usuario:\n${fileContext}` : "",
  ].join("");

  const historyMessages = history.slice(-10).map((m) => ({
    role: m.role,
    content: m.agentName ? `[${m.agentName}]: ${m.content}` : m.content,
  }));

  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
  const payload = JSON.stringify({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: userMessage },
    ],
    stream: false,
    options: { temperature: 0.7, num_predict: 1024 },
  });

  try {
    const raw = await httpPost(`${ollamaUrl}/api/chat`, payload);
    const data = JSON.parse(raw) as { message?: { content: string }; error?: string };
    if (data.error) throw new Error(data.error);
    return data.message?.content ?? "Sin respuesta.";
  } catch (err) {
    return `[${agent.name}]: Error Ollama — ${err instanceof Error ? err.message : "Unknown error"}`;
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

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

    const body = await req.json() as {
      content: string;
      provider?: "anthropic" | "ollama";
      model?: string;
      fileContext?: string;
    };

    const userMessage: string = body.content;
    if (!userMessage?.trim()) return NextResponse.json({ error: "Missing content" }, { status: 400 });

    const provider = body.provider ?? "anthropic";
    const fileContext = body.fileContext;

    // Resolve model: use request model, or agent.model (anthropic only), or sensible default
    const resolveModel = (agent: AgentInfo) => {
      if (body.model) return body.model;
      if (provider === "anthropic") return agent.model ?? "claude-haiku-4-5-20251001";
      return "qwen2.5:3b";
    };

    const history = (thread.messages as Message[]) ?? [];
    const config = (team.config as TeamConfig) ?? {};
    const agents: AgentInfo[] = team.members.map((m) => ({
      ...m.agent,
      role: m.role,
    }));

    const updatedHistory: Message[] = [
      ...history,
      { role: "user", content: userMessage },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const selectedAgents = await routeMessage({ name: team.name, config }, agents, userMessage);
          const responseStyle = config.responseStyle ?? "individual";
          const responses: { agent: AgentInfo; text: string }[] = [];

          if (responseStyle === "individual" || selectedAgents.length === 1) {
            for (const agent of selectedAgents) {
              controller.enqueue(encoder.encode(`**[${agent.name}]**\n\n`));
              const text = provider === "ollama"
                ? await callOllama(agent, { name: team.name, config }, history, userMessage, resolveModel(agent), fileContext)
                : await callAnthropic(agent, { name: team.name, config }, history, userMessage, resolveModel(agent), fileContext);
              controller.enqueue(encoder.encode(text));
              if (selectedAgents.indexOf(agent) < selectedAgents.length - 1) {
                controller.enqueue(encoder.encode("\n\n---\n\n"));
              }
              responses.push({ agent, text });
            }
          } else {
            for (const agent of selectedAgents) {
              const text = provider === "ollama"
                ? await callOllama(agent, { name: team.name, config }, history, userMessage, resolveModel(agent), fileContext)
                : await callAnthropic(agent, { name: team.name, config }, history, userMessage, resolveModel(agent), fileContext);
              responses.push({ agent, text });
            }
            const synthesized = responses
              .map((r) => `**[${r.agent.name}${r.agent.role ? ` — ${r.agent.role}` : ""}]**\n\n${r.text}`)
              .join("\n\n---\n\n");
            controller.enqueue(encoder.encode(synthesized));
          }

          const assistantContent = responses.map((r) => `[${r.agent.name}]: ${r.text}`).join("\n\n");
          const primaryAgent = responses[0]?.agent;

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
