export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "open";

  const actions = await prisma.pendingAction.findMany({
    where: status === "all" ? {} : { status },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, description: true, category: true, priority: true, status: true, context: true, createdAt: true },
  });

  return NextResponse.json(actions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const body = await req.json() as {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    context?: Record<string, unknown>;
  };

  if (!body.title?.trim() || !body.description?.trim()) return apiError("title and description required", 400);

  const action = await prisma.pendingAction.create({
    data: {
      title: body.title.trim(),
      description: body.description.trim(),
      category: body.category ?? "general",
      priority: body.priority ?? "normal",
      context: body.context ?? {},
    },
    select: { id: true, title: true, description: true, category: true, priority: true, status: true, createdAt: true },
  });

  return NextResponse.json(action, { status: 201 });
}
