import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    version: "0.1.0",
    downloadUrl: "",
    changelog: "Initial release",
  });
}
