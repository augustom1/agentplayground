import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return apiError("Forbidden", 403);
  }

  const licenses = await prisma.license.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, key: true, plan: true, userEmail: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json(licenses);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return apiError("Forbidden", 403);
  }

  const body = (await req.json()) as { plan: string; userEmail: string; expiresAt?: string };
  if (!body.plan || !body.userEmail) return apiError("plan and userEmail are required", 400);

  const license = await prisma.license.create({
    data: {
      key: crypto.randomUUID(),
      plan: body.plan,
      userEmail: body.userEmail,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });

  return NextResponse.json(license, { status: 201 });
}
