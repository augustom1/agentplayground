/**
 * Local LLM task runner — uses Ollama instead of Anthropic API.
 * For overnight/batch tasks that don't need tool calls.
 */

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
const DEFAULT_MODEL = process.env.OLLAMA_OVERNIGHT_MODEL || "qwen2.5:7b";

export interface LocalTaskInput {
  taskId: string;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}

export interface LocalTaskResult {
  taskId: string;
  content: string;
  model: string;
  success: boolean;
  error?: string;
}

export async function runLocalTask(input: LocalTaskInput): Promise<LocalTaskResult> {
  const model = input.model || DEFAULT_MODEL;

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user",   content: input.userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(300_000), // 5 min per task
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return { taskId: input.taskId, content: "", model, success: false, error: `Ollama ${res.status}: ${err}` };
    }

    type OllamaResp = { message: { content: string } };
    const data = await res.json() as OllamaResp;
    const content = data.message?.content?.trim() || "";

    return { taskId: input.taskId, content, model, success: true };
  } catch (err) {
    return { taskId: input.taskId, content: "", model, success: false, error: String(err) };
  }
}

/** Pull a model on Ollama if not already present */
export async function ensureModel(model: string): Promise<boolean> {
  try {
    const check = await fetch(`${OLLAMA_URL}/api/show`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
      signal: AbortSignal.timeout(10_000),
    });
    if (check.ok) return true;

    // Pull it
    await fetch(`${OLLAMA_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: false }),
      signal: AbortSignal.timeout(600_000), // 10 min pull timeout
    });
    return true;
  } catch {
    return false;
  }
}
