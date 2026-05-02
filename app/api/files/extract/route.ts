import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

const TEXT_EXTENSIONS = /\.(txt|md|csv|json|ts|tsx|js|jsx|py|sh|yaml|yml|toml|xml|html|css|rb|go|rs|java|c|cpp|h)$/i;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // PDF extraction
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return NextResponse.json({
        text: data.text.slice(0, 50000),
        pages: data.numpages,
        filename: file.name,
      });
    } catch (err) {
      return NextResponse.json({ error: `PDF parse error: ${String(err)}` }, { status: 500 });
    }
  }

  // Plain text / code files
  if (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    file.type === "application/javascript" ||
    TEXT_EXTENSIONS.test(file.name)
  ) {
    const text = buffer.toString("utf-8");
    return NextResponse.json({ text: text.slice(0, 50000), filename: file.name });
  }

  return NextResponse.json({ error: "Unsupported file type for text extraction" }, { status: 415 });
}
