import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateTaskPlan } from "@/lib/executor";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { taskId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  try {
    const result = await generateTaskPlan(body.taskId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
