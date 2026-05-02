/**
 * Telegram audio download + Whisper transcription helpers
 */

const TELEGRAM_FILE_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

/** Download any Telegram file by file_id, returns a Buffer */
export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  const metaRes = await fetch(`${TELEGRAM_FILE_API}/getFile?file_id=${encodeURIComponent(fileId)}`);
  const meta = (await metaRes.json()) as { ok: boolean; result?: { file_path: string } };
  if (!meta.ok || !meta.result?.file_path) {
    throw new Error(`getFile failed: ${JSON.stringify(meta)}`);
  }

  const downloadUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${meta.result.file_path}`;
  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    throw new Error(`File download failed: ${fileRes.status}`);
  }

  return Buffer.from(await fileRes.arrayBuffer());
}

/**
 * Download a Telegram voice/audio file and transcribe it via OpenAI Whisper.
 * Returns the transcript string (or a fallback description if no API key).
 */
export async function transcribeAudio(fileId: string, durationSeconds: number): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `[Voice note — ${durationSeconds}s — transcription unavailable: set OPENAI_API_KEY]`;
  }

  const audioBuffer = await downloadTelegramFile(fileId);

  const blob = new Blob([audioBuffer], { type: "audio/ogg" });
  const formData = new FormData();
  formData.append("file", blob, "voice.ogg");
  formData.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper API error: ${err}`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text || "[Could not transcribe audio]";
}
