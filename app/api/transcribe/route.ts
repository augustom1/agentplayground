import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Option A: OpenAI Whisper API
  if (process.env.OPENAI_API_KEY) {
    const openaiForm = new FormData();
    openaiForm.append("file", file);
    openaiForm.append("model", "whisper-1");

    try {
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: openaiForm,
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: `Whisper API error: ${err}` }, { status: res.status });
      }

      const data = (await res.json()) as { text: string };
      return NextResponse.json({ transcript: data.text });
    } catch (err) {
      return NextResponse.json({ error: `Transcription failed: ${String(err)}` }, { status: 500 });
    }
  }

  // No API key configured
  return NextResponse.json(
    {
      error: "Audio transcription requires OPENAI_API_KEY.",
      hint: "Add OPENAI_API_KEY to .env.local — Whisper costs ~$0.006/min of audio.",
    },
    { status: 503 }
  );
}
