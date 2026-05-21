export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

type Params = { params: Promise<{ id: string }> };

// POST /api/admin/api-monitor/clients/[id]/rotate — generate new key
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;
  try {
    const rawKey = crypto.randomBytes(32).toString("hex");
    const prefix = rawKey.slice(0, 8);
    const hashedKey = await bcrypt.hash(rawKey, 10);

    const client = await prisma.apiClient.update({
      where: { id },
      data: { apiKey: hashedKey, apiKeyPrefix: prefix },
    });

    const { apiKey: _, ...safe } = client;
    return NextResponse.json({ ...safe, plaintextKey: rawKey });
  } catch (err) {
    return apiError(err);
  }
}
