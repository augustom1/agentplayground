import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

const KEY_NAMES = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"] as const;

async function getStoredKey(name: string): Promise<string | null> {
  const mem = await prisma.agentMemory.findFirst({
    where: { ownerType: "system", ownerId: name },
    select: { content: true },
  });
  return mem?.content ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const [anthropicKey, openaiKey, nvidiaKey] = await Promise.all([
    getStoredKey("ANTHROPIC_API_KEY"),
    getStoredKey("OPENAI_API_KEY"),
    getStoredKey("NVIDIA_API_KEY"),
  ]);

  return NextResponse.json({
    anthropicKey: !!(process.env.ANTHROPIC_API_KEY || anthropicKey),
    openaiKey: !!(process.env.OPENAI_API_KEY || openaiKey),
    nvidiaKey: !!(process.env.NVIDIA_API_KEY || nvidiaKey),
    anthropicSource: process.env.ANTHROPIC_API_KEY ? "env" : anthropicKey ? "db" : "none",
    openaiSource: process.env.OPENAI_API_KEY ? "env" : openaiKey ? "db" : "none",
    nvidiaSource: process.env.NVIDIA_API_KEY ? "env" : nvidiaKey ? "db" : "none",
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const body = (await req.json()) as { anthropicKey?: string; openaiKey?: string; nvidiaKey?: string };

  for (const [keyName, value] of [
    ["ANTHROPIC_API_KEY", body.anthropicKey],
    ["OPENAI_API_KEY", body.openaiKey],
    ["NVIDIA_API_KEY", body.nvidiaKey],
  ] as [string, string | undefined][]) {
    if (value === undefined) continue;
    const trimmed = value.trim();

    const existing = await prisma.agentMemory.findFirst({
      where: { ownerType: "system", ownerId: keyName },
      select: { id: true },
    });

    if (trimmed === "") {
      if (existing) {
        await prisma.agentMemory.delete({ where: { id: existing.id } });
      }
    } else if (existing) {
      await prisma.agentMemory.update({
        where: { id: existing.id },
        data: { content: trimmed, accessedAt: new Date() },
      });
    } else {
      await prisma.agentMemory.create({
        data: {
          ownerType: "system",
          ownerId: keyName,
          content: trimmed,
          memoryType: "preference",
          tenantId: "default",
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
