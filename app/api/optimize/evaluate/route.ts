export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { evaluateAndWriteProtocol, TaskCompletionData } from "@/lib/optimizer/protocol-writer";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";

// POST /api/optimize/evaluate
// Called after each Claude API task completes (fire-and-forget from chat route).
// Uses a local Ollama model to evaluate whether a protocol can be written.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Omit<TaskCompletionData, "userId">;
    const written = await evaluateAndWriteProtocol({
      ...body,
      userId: session.user.id,
    });
    return NextResponse.json({ protocolWritten: written });
  } catch (err) {
    return apiError(err);
  }
}
