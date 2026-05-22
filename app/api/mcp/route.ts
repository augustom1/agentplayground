import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { searchVault, readVaultNote, ingestToVault, indexVaultNote } from "@/lib/brain";
import { runDelegatedTask } from "@/lib/agents/delegated";

const SERVER_INFO = {
  name: "AgentPlayground",
  version: "2.0.0",
};

const PROTOCOL_VERSION = "2024-11-05";

const MCP_TOOLS = [
  // ── Vault / Brain ────────────────────────────────────────────────────────────
  {
    name: "vault_search",
    description: "Semantic search across all notes in the 2nd Brain vault. Returns the most relevant notes.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        topK: { type: "number", description: "Number of results (default 5, max 20)" },
      },
      required: ["query"],
    },
  },
  {
    name: "vault_read",
    description: "Read a specific note from the vault by its path.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Note path, e.g. inbox/2026-05-02-idea.md" },
      },
      required: ["path"],
    },
  },
  {
    name: "vault_write",
    description: "Save a new note to the vault inbox. Automatically indexed for semantic search.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Note title" },
        content: { type: "string", description: "Note content (markdown)" },
        tags: { type: "array", items: { type: "string" }, description: "Optional tags" },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "search_brain",
    description: "Search the 2nd Brain for context on a topic — alias for vault_search with rich formatting.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic or question to search for" },
        limit: { type: "number", description: "Max results (default 5)" },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_context",
    description: "Get vault notes + active projects for a topic. Use before answering questions about the user's knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic to search for context" },
      },
      required: ["topic"],
    },
  },

  // ── Agent Teams ──────────────────────────────────────────────────────────────
  {
    name: "list_teams",
    description: "List all available agent teams in the platform. Returns team names, IDs, and descriptions.",
    inputSchema: {
      type: "object",
      properties: {
        includeSystem: { type: "boolean", description: "Include system teams (default: false)" },
      },
    },
  },
  {
    name: "ask_team",
    description: "Ask a specific agent team a question or give it a task. The team runs its tool loop and returns a result. Use this to delegate specialized work.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID (get from list_teams)" },
        message: { type: "string", description: "Message or task for the team" },
        context: { type: "string", description: "Optional background context" },
      },
      required: ["teamId", "message"],
    },
  },
  {
    name: "run_agent",
    description: "Run a specific agent on a task directly. Returns the agent's response.",
    inputSchema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent ID to run" },
        prompt: { type: "string", description: "Task or question for the agent" },
      },
      required: ["agentId", "prompt"],
    },
  },

  // ── Tasks ────────────────────────────────────────────────────────────────────
  {
    name: "create_task",
    description: "Create a task and assign it to an agent team. The task is queued for execution.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Detailed task description" },
        teamId: { type: "string", description: "Team to assign this task to" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "urgent"],
          description: "Task priority (default: medium)",
        },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "list_tasks",
    description: "List tasks for a team or across all teams.",
    inputSchema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Filter by team ID (optional)" },
        status: { type: "string", enum: ["pending", "running", "completed", "failed"], description: "Filter by status" },
        limit: { type: "number", description: "Max results (default: 20)" },
      },
    },
  },

  // ── Misc ─────────────────────────────────────────────────────────────────────
  {
    name: "dispatch_task",
    description: "Create and dispatch a task to the platform. Keeper routes it to the best team.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Task description" },
        context: { type: "string", description: "Optional context" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority (default: medium)" },
      },
      required: ["description"],
    },
  },
];

// ── Auth ──────────────────────────────────────────────────────────────────────

async function validateApiKey(req: NextRequest): Promise<{ userId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.slice(7).trim();
  if (!key) return null;
  const hashed = createHash("sha256").update(key).digest("hex");
  const user = await prisma.user.findFirst({
    where: { apiKey: hashed, active: true },
    select: { id: true },
  });
  return user ? { userId: user.id } : null;
}

function jsonrpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });
}

function jsonrpcResult(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

// ── Tool executor ─────────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {

    case "vault_search":
    case "search_brain": {
      const query = (args.query ?? args.topic) as string;
      const topK = Math.min(Number(args.topK ?? args.limit) || 5, 20);
      const results = await searchVault(query, topK);
      if (results.length === 0) return [{ type: "text", text: "No matching notes found." }];
      const formatted = results
        .map((r, i) => `## ${i + 1}. ${r.title}\n**Path:** ${r.path}\n\n${r.content}`)
        .join("\n\n---\n\n");
      return [{ type: "text", text: formatted }];
    }

    case "vault_read": {
      const notePath = args.path as string;
      const content = await readVaultNote(notePath);
      if (!content) return [{ type: "text", text: `Note not found: ${notePath}` }];
      return [{ type: "text", text: content }];
    }

    case "vault_write": {
      const title = args.title as string;
      const content = args.content as string;
      const tags = (args.tags as string[] | undefined) || [];
      const notePath = await ingestToVault(content, title, tags);
      indexVaultNote({ path: notePath, title, content, tags }).catch(() => {});
      return [{ type: "text", text: `Saved to vault: ${notePath}` }];
    }

    case "get_context": {
      const topic = args.topic as string;
      const [vaultResults, projects] = await Promise.allSettled([
        searchVault(topic, 5),
        prisma.project.findMany({ where: { status: "active" }, orderBy: { updatedAt: "desc" }, take: 5 }),
      ]);
      const notes = vaultResults.status === "fulfilled" ? vaultResults.value : [];
      const activeProjects = projects.status === "fulfilled" ? projects.value : [];
      const parts: string[] = [];
      if (notes.length > 0) {
        parts.push(`## Vault Notes (${notes.length})\n` + notes.map((n) => `### ${n.title}\n${n.content}`).join("\n\n---\n\n"));
      } else {
        parts.push("## Vault Notes\nNo relevant notes found.");
      }
      if (activeProjects.length > 0) {
        parts.push(`## Active Projects\n` + activeProjects.map((p) => `- **${p.name}**: ${p.description || "no description"}`).join("\n"));
      }
      void userId;
      return [{ type: "text", text: parts.join("\n\n") }];
    }

    case "list_teams": {
      const includeSystem = args.includeSystem === true;
      const teams = await prisma.agentTeam.findMany({
        where: includeSystem ? {} : { isSystemTeam: false },
        select: { id: true, name: true, description: true, status: true, category: true, _count: { select: { agents: true } } },
        orderBy: { updatedAt: "desc" },
      });
      const formatted = teams
        .map((t) => `**${t.name}** (ID: \`${t.id}\`)\n  Category: ${t.category} · Agents: ${t._count.agents} · Status: ${t.status}\n  ${t.description}`)
        .join("\n\n");
      return [{ type: "text", text: formatted || "No teams found." }];
    }

    case "ask_team": {
      const teamId = args.teamId as string;
      const message = args.message as string;
      const context = args.context as string | undefined;
      const fullDesc = context ? `Context: ${context}\n\n---\n\n${message}` : message;

      const team = await prisma.agentTeam.findUnique({ where: { id: teamId }, select: { name: true } });
      if (!team) return [{ type: "text", text: `Team not found: ${teamId}` }];

      const result = await runDelegatedTask(`mcp-ask-${Date.now()}`, {
        title: message.slice(0, 80),
        description: fullDesc,
        teamId,
      });
      return [{ type: "text", text: result.content || result.summary || "No result." }];
    }

    case "run_agent": {
      const agentId = args.agentId as string;
      const prompt = args.prompt as string;
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { name: true, teamId: true },
      });
      if (!agent) return [{ type: "text", text: `Agent not found: ${agentId}` }];
      const result = await runDelegatedTask(`mcp-agent-${Date.now()}`, {
        title: `${agent.name}: ${prompt.slice(0, 60)}`,
        description: prompt,
        teamId: agent.teamId,
      });
      return [{ type: "text", text: result.content || result.summary || "No result." }];
    }

    case "create_task": {
      const title = args.title as string;
      const description = args.description as string;
      const priority = (args.priority as string) || "medium";

      let teamId = args.teamId as string | undefined;
      if (!teamId) {
        const team = await prisma.agentTeam.findFirst({
          where: { isSystemTeam: false },
          orderBy: { updatedAt: "desc" },
        });
        if (!team) return [{ type: "text", text: "No teams found. Create a team first." }];
        teamId = team.id;
      }

      const task = await prisma.task.create({
        data: { title, description, teamId, priority, status: "pending" },
        include: { team: { select: { name: true } } },
      });
      return [{ type: "text", text: `Task created (ID: \`${task.id}\`) and assigned to **${task.team.name}**. Priority: ${priority}.` }];
    }

    case "list_tasks": {
      const teamId = args.teamId as string | undefined;
      const status = args.status as string | undefined;
      const limit = Math.min(Number(args.limit) || 20, 50);

      const tasks = await prisma.task.findMany({
        where: {
          ...(teamId && { teamId }),
          ...(status && { status }),
        },
        include: { team: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      if (tasks.length === 0) return [{ type: "text", text: "No tasks found." }];
      const formatted = tasks
        .map((t) => `**${t.title}** [${t.status}]\n  Team: ${t.team.name} · Priority: ${t.priority}\n  ${t.description?.slice(0, 100) ?? ""}`)
        .join("\n\n");
      return [{ type: "text", text: formatted }];
    }

    case "dispatch_task": {
      const description = args.description as string;
      const context = args.context as string | undefined;
      const priority = (args.priority as string) || "medium";

      const team = await prisma.agentTeam.findFirst({
        where: { isSystemTeam: false },
        orderBy: { updatedAt: "desc" },
      });
      if (!team) return [{ type: "text", text: "No agent teams found. Create a team first." }];

      const task = await prisma.task.create({
        data: {
          title: description.slice(0, 120),
          description: context ? `${description}\n\nContext: ${context}` : description,
          teamId: team.id,
          priority,
          status: "pending",
        },
      });
      return [{ type: "text", text: `Task created (ID: \`${task.id}\`) and dispatched to **${team.name}**. Priority: ${priority}.` }];
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Request handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized. Provide a valid API key as: Authorization: Bearer <key>" } },
      { status: 401 }
    );
  }

  let body: { jsonrpc: string; id: unknown; method: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return jsonrpcError(null, -32700, "Parse error");
  }

  const { id, method, params = {} } = body;

  switch (method) {
    case "initialize":
      return jsonrpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {} },
      });

    case "tools/list":
      return jsonrpcResult(id, { tools: MCP_TOOLS });

    case "tools/call": {
      const toolName = params.name as string;
      const toolArgs = (params.arguments as Record<string, unknown>) || {};
      if (!toolName) return jsonrpcError(id, -32602, "Missing tool name");
      const tool = MCP_TOOLS.find((t) => t.name === toolName);
      if (!tool) return jsonrpcError(id, -32602, `Unknown tool: ${toolName}`);
      try {
        const content = await callTool(toolName, toolArgs, auth.userId);
        return jsonrpcResult(id, { content });
      } catch (err) {
        return jsonrpcError(id, -32603, String(err));
      }
    }

    case "ping":
      return jsonrpcResult(id, {});

    default:
      return jsonrpcError(id, -32601, `Method not found: ${method}`);
  }
}

// MCP clients send GET for discovery
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocol: PROTOCOL_VERSION,
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}
