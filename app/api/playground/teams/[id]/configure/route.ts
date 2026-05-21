export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

const CONFIGURE_SYSTEM = `You are a team configuration assistant. The user will describe what they want to change about their agent team. You will update the team configuration JSON accordingly.

The config object has these fields (all optional):
- systemPrompt: string — instructions all agents in this team follow
- routingRules: string — hints for routing messages to specific agents (e.g. "legal questions → Lex, research tasks → Scout")
- toolAccess: string[] — tools available in this team context
- responseStyle: "individual" | "synthesized" — individual: each agent speaks separately; synthesized: a unified reply

Return a JSON object in this exact format:
{
  "changes": { ...the fields you changed, merged with current config },
  "summary": "One sentence describing what changed"
}

Only return the JSON object. No markdown fences, no extra text.`;

// POST /api/playground/teams/[id]/configure
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id } = await params;

    const team = await prisma.playgroundTeam.findUnique({ where: { id } });
    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    const body = await req.json();
    const instruction: string = body.instruction;
    if (!instruction?.trim()) return apiError("Missing instruction", 400);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return apiError("ANTHROPIC_API_KEY not set", 500);

    const currentConfig = JSON.stringify(team.config ?? {}, null, 2);
    const prompt = `Current config:\n${currentConfig}\n\nUser instruction: "${instruction}"`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: CONFIGURE_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content.find((b) => b.type === "text")?.text ?? "";
    const parsed = JSON.parse(text);

    const updatedConfig = { ...(team.config as object), ...parsed.changes };

    await prisma.playgroundTeam.update({
      where: { id },
      data: { config: updatedConfig },
    });

    return NextResponse.json({ summary: parsed.summary, config: updatedConfig });
  } catch (err) {
    return apiError(err);
  }
}
