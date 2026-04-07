export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const { name, description, type, schedule, deliveryChannel } = body;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const project = await prisma.project.create({
    data: {
      name,
      description: description ?? null,
      type: type ?? "one-time",
      schedule: schedule ?? undefined,
      deliveryChannel: deliveryChannel ?? null,
      status: "active",
    },
  });

  return NextResponse.json(project, { status: 201 });
}
