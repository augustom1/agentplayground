export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function readMem(ownerId: string): Promise<string | null> {
  const mem = await prisma.agentMemory.findFirst({
    where: { ownerType: "system", ownerId },
    select: { content: true },
  });
  return mem?.content ?? null;
}

async function writeMem(ownerId: string, content: string) {
  const existing = await prisma.agentMemory.findFirst({
    where: { ownerType: "system", ownerId },
    select: { id: true },
  });
  if (existing) {
    await prisma.agentMemory.update({
      where: { id: existing.id },
      data: { content, accessedAt: new Date() },
    });
  } else {
    await prisma.agentMemory.create({
      data: { ownerType: "system", ownerId, content, memoryType: "preference", tenantId: "default" },
    });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [provider, model] = await Promise.all([
    readMem("DEFAULT_PROVIDER"),
    readMem("DEFAULT_MODEL"),
  ]);

  return NextResponse.json({
    provider: provider ?? "anthropic",
    model: model ?? "claude-sonnet-4-6",
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { provider?: string; model?: string };
  const provider = body.provider?.trim();
  const model = body.model?.trim();

  if (!provider || !model) {
    return NextResponse.json({ error: "provider and model are required" }, { status: 400 });
  }

  await Promise.all([
    writeMem("DEFAULT_PROVIDER", provider),
    writeMem("DEFAULT_MODEL", model),
  ]);

  return NextResponse.json({ ok: true, provider, model });
}
