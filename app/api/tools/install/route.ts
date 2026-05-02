import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkSafety } from "@/lib/tool-installer/safety-checker";
import { installNpmPackage, installPipPackage, installMCPServer, testSSHConnection } from "@/lib/tool-installer/installer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    package: string;
    type: "npm" | "pip" | "mcp";
    purpose: string;
    version?: string;
    skipConfirmation?: boolean;
  };

  const { package: packageName, type, purpose, version, skipConfirmation } = body;
  if (!packageName || !type) {
    return NextResponse.json({ error: "package and type are required" }, { status: 400 });
  }

  // Safety check
  const safety = await checkSafety(packageName, type);
  if (!safety.approved) {
    return NextResponse.json({ success: false, blocked: true, safety }, { status: 422 });
  }
  if (safety.requiresConfirmation && !skipConfirmation) {
    return NextResponse.json({ success: false, requiresConfirmation: true, safety }, { status: 202 });
  }

  // SSH check
  const ssh = await testSSHConnection();
  if (!ssh.ok) {
    return NextResponse.json({ success: false, error: `SSH not available: ${ssh.error}` }, { status: 503 });
  }

  // Install
  let result;
  if (type === "npm") result = await installNpmPackage(packageName, version);
  else if (type === "pip") result = await installPipPackage(packageName);
  else result = await installMCPServer(packageName);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error, output: result.output }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    package: packageName,
    type,
    purpose,
    safety,
    output: result.output,
  });
}
