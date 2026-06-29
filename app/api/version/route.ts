import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    version: "0.1.0",
    downloadUrl: "https://github.com/augustom1/agentplayground/releases/download/v0.1.0/agentplayground-v0.1.0.zip",
    changelog: "First release — agent teams, Playground dashboards, first-run wizard",
  });
}
