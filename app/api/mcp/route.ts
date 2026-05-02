import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { searchVault, readVaultNote, ingestToVault, indexVaultNote } from "@/lib/brain";

const SERVER_INFO = {
  name: "AgentPlayground Brain",
  version: "1.0.0",
};

const PROTOCOL_VERSION = "2024-11-05";

const MCP_TOOLS = [
  {
    name: "vault_search",
    description: "Semantic search across all notes in the 2nd Brain vault. Returns the most relevant notes for the given query.",
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
        tags: { type: "array", items: { type: "string" }, description: "Optional tags, e.g. ['#research', '#project']" },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "dispatch_task",
    description: "Create and dispatch a task to the agent platform. The Keeper will route it to the appropriate team.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Task description" },
        context: { type: "string", description: "Optional context or background" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Task priority (default: medium)" },
      },
      required: ["description"],
    },
  },
  {
    name: "get_context",
    description: "Get the most relevant vault notes and active projects for a given topic. Use this before answering questions about the user's knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic to search for context" },
      },
      required: ["topic"],
    },
  },
];

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

async function callTool(name: string, args: Record<string, unknown>, userId: string) {
  switch (name) {
    case "vault_search": {
      const query = args.query as string;
      const topK = Math.min(Number(args.topK) || 5, 20);
      const results = await searchVault(query, topK);
      if (results.length === 0) {
        return [{ type: "text", text: "No matching notes found in the vault." }];
      }
      const formatted = results
        .map((r, i) => `## ${i + 1}. ${r.title} (${r.path})\n${r.content}`)
        .join("\n\n---\n\n");
      return [{ type: "text", text: formatted }];
    }

    case "vault_read": {
      const notePath = args.path as string;
      const content = await readVaultNote(notePath);
      if (!content) {
        return [{ type: "text", text: `Note not found: ${notePath}` }];
      }
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

    case "dispatch_task": {
      const description = args.description as string;
      const context = args.context as string | undefined;
      const priority = (args.priority as string) || "medium";

      const team = await prisma.agentTeam.findFirst({
        where: { isSystemTeam: false },
        orderBy: { updatedAt: "desc" },
      });

      if (!team) {
        return [{ type: "text", text: "No agent teams found. Create a team first at app.agentplayground.net." }];
      }

      const task = await prisma.task.create({
        data: {
          title: description.slice(0, 120),
          description: context ? `${description}\n\nContext: ${context}` : description,
          teamId: team.id,
          priority,
          status: "pending",
        },
      });

      return [{ type: "text", text: `Task created (ID: ${task.id}) and dispatched to ${team.name}. Priority: ${priority}.` }];
    }

    case "get_context": {
      const topic = args.topic as string;

      const [vaultResults, projects] = await Promise.allSettled([
        searchVault(topic, 5),
        prisma.project.findMany({
          where: { status: "active" },
          orderBy: { updatedAt: "desc" },
          take: 5,
        }),
      ]);

      const notes = vaultResults.status === "fulfilled" ? vaultResults.value : [];
      const activeProjects = projects.status === "fulfilled" ? projects.value : [];

      const parts: string[] = [];

      if (notes.length > 0) {
        parts.push(`## Vault Notes (${notes.length} relevant)\n` +
          notes.map((n) => `### ${n.title}\n${n.content}`).join("\n\n---\n\n"));
      } else {
        parts.push("## Vault Notes\nNo relevant notes found.");
      }

      if (activeProjects.length > 0) {
        parts.push(`## Active Projects\n` +
          activeProjects.map((p) => `- **${p.name}** [${p.status}]: ${p.description || "no description"}`).join("\n"));
      }

      void userId; // available for future per-user filtering
      return [{ type: "text", text: parts.join("\n\n") }];
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized. Provide a valid API key in Authorization: Bearer <key>" } },
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

      if (!toolName) {
        return jsonrpcError(id, -32602, "Missing tool name");
      }

      const tool = MCP_TOOLS.find((t) => t.name === toolName);
      if (!tool) {
        return jsonrpcError(id, -32602, `Unknown tool: ${toolName}`);
      }

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

// MCP clients may send OPTIONS or GET for discovery
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    name: SERVER_INFO.name,
    version: SERVER_INFO.version,
    protocol: PROTOCOL_VERSION,
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
  });
}
