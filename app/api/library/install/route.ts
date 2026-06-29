export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  return NextResponse.json(
    { error: "Library import coming in Phase 3. Download playground packages from agentplayground.net/library." },
    { status: 501 }
  );
}
