import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchVault } from "@/lib/brain";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q");
  const topK = Math.min(parseInt(req.nextUrl.searchParams.get("topK") || "5"), 20);

  if (!q) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const results = await searchVault(q, topK);
  return NextResponse.json({ results });
}
