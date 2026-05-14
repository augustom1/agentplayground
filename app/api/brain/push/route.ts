import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import { ingestToVault, indexVaultNote } from "@/lib/brain";

const APP_URL = process.env.NEXTAUTH_URL || "https://app.agentplayground.net";

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
}

async function validateApiKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.slice(7).trim();
  if (!key) return null;
  const hashed = createHash("sha256").update(key).digest("hex");
  return prisma.user.findFirst({ where: { apiKey: hashed, active: true }, select: { id: true } });
}

// POST — push a note to the vault from any external AI
export async function POST(req: NextRequest) {
  const user = await validateApiKey(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized. Provide your AgentPlayground API key as: Authorization: Bearer <key>" }, { status: 401 });
  }

  let body: { title: string; content: string; team?: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, content, team, tags = [] } = body;
  if (!title || !content) {
    return NextResponse.json({ error: "title and content are required" }, { status: 400 });
  }

  const folder = team ? `Teams/${slugify(team)}` : "inbox";
  const allTags = [...tags];
  if (team) allTags.push(`team:${slugify(team)}`);

  const notePath = await ingestToVault(content, title, allTags, folder);
  indexVaultNote({ path: notePath, title, content, tags: allTags }).catch(() => {});

  return NextResponse.json({ ok: true, path: notePath, folder });
}

// GET — return OpenAPI schema for ChatGPT Custom GPT Actions
export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "AgentPlayground Brain",
      version: "1.0.0",
      description: "Push notes and context to the AgentPlayground 2nd Brain. Notes are immediately indexed for semantic search and available to agent teams.",
    },
    servers: [{ url: APP_URL }],
    paths: {
      "/api/brain/push": {
        post: {
          operationId: "pushToBrain",
          summary: "Push a note to the Brain vault",
          description: "Save structured content (strategies, briefs, research, ideas) to the Brain. Use the 'team' field to route content directly to a specific agent team's folder so they pick it up automatically.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "content"],
                  properties: {
                    title: { type: "string", description: "Descriptive title for the note" },
                    content: { type: "string", description: "Note content in markdown format" },
                    team: {
                      type: "string",
                      description: "Optional: route this note to a specific agent team folder (e.g. 'marketing', 'research'). If omitted, saves to inbox/.",
                    },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                      description: "Optional tags, e.g. ['#strategy', '#q3', '#campaign']",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Note saved and indexed",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ok: { type: "boolean" },
                      path: { type: "string", description: "Vault path where the note was saved" },
                      folder: { type: "string", description: "Folder the note was saved into" },
                    },
                  },
                },
              },
            },
          },
          security: [{ bearerAuth: [] }],
        },
      },
      "/api/mcp": {
        post: {
          operationId: "mcpToolCall",
          summary: "Call a Brain tool via MCP JSON-RPC",
          description: "Full MCP tool interface: vault_search, vault_read, vault_write, dispatch_task, get_context.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    jsonrpc: { type: "string", example: "2.0" },
                    id: { type: "integer", example: 1 },
                    method: { type: "string", example: "tools/call" },
                    params: { type: "object" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "MCP JSON-RPC response" } },
          security: [{ bearerAuth: [] }],
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "Your AgentPlayground API key from Settings → Connect" },
      },
    },
  });
}
