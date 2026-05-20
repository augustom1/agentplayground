export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptApiKey } from "@/lib/providers";

export async function GET() {
  const providers = await prisma.llmProvider.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true, name: true, type: true, baseUrl: true,
      models: true, isDefault: true, role: true, createdAt: true,
      apiKeyEnc: true,
    },
  });
  return NextResponse.json(
    providers.map((p) => ({ ...p, hasApiKey: !!p.apiKeyEnc, apiKeyEnc: undefined }))
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name: string;
    type: string;
    baseUrl?: string;
    apiKey?: string;
    models?: string[];
    isDefault?: boolean;
    role?: string;
  };

  if (!body.name || !body.type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  if (body.isDefault && body.role) {
    await prisma.llmProvider.updateMany({
      where: { role: body.role, isDefault: true },
      data: { isDefault: false },
    });
  }

  const provider = await prisma.llmProvider.create({
    data: {
      name: body.name,
      type: body.type,
      baseUrl: body.baseUrl ?? null,
      apiKeyEnc: body.apiKey ? encryptApiKey(body.apiKey) : null,
      models: body.models ?? [],
      isDefault: body.isDefault ?? false,
      role: body.role ?? null,
    },
  });

  return NextResponse.json({ ...provider, hasApiKey: !!provider.apiKeyEnc, apiKeyEnc: undefined });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.llmProvider.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
