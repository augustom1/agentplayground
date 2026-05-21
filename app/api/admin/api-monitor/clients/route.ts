export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ApiClientType } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET /api/admin/api-monitor/clients
export async function GET() {
  if (!await requireAdmin()) return apiError("Forbidden", 403);
  try {
    const clients = await prisma.apiClient.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { requests: true } } },
    });
    // Never return raw key
    return NextResponse.json(clients.map(({ apiKey: _, ...c }) => c));
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/admin/api-monitor/clients — create new client, return key once
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return apiError("Forbidden", 403);
  try {
    const body = await req.json();
    if (!body.name || !body.type) return apiError("Missing name or type", 400);
    if (!Object.values(ApiClientType).includes(body.type)) {
      return apiError(`Invalid type. Must be one of: ${Object.values(ApiClientType).join(", ")}`, 400);
    }

    const rawKey = crypto.randomBytes(32).toString("hex");
    const prefix = rawKey.slice(0, 8);
    const hashedKey = await bcrypt.hash(rawKey, 10);

    const client = await prisma.apiClient.create({
      data: {
        name: body.name,
        type: body.type as ApiClientType,
        apiKey: hashedKey,
        apiKeyPrefix: prefix,
        rateLimit: body.rateLimit ?? 100,
        permissions: body.permissions ?? [],
      },
    });

    const { apiKey: _, ...safe } = client;
    return NextResponse.json({ ...safe, plaintextKey: rawKey }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
