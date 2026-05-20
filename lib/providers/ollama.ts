import type { LLMProvider, CompletionParams, CompletionResult } from "./types";

const DEFAULT_EMBED_MODEL = "nomic-embed-text";

export class OllamaProvider implements LLMProvider {
  id = "ollama";
  name = "Ollama (local)";
  type = "ollama" as const;

  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || "http://ollama:11434";
  }

  async models(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: { name: string }[] };
      return data.models?.map((m) => m.name) ?? [];
    } catch {
      return [];
    }
  }

  async complete(params: CompletionParams): Promise<CompletionResult> {
    const model = params.model || "qwen2.5:7b";

    // Build a single prompt string for Ollama chat format
    const systemMsg = params.system ? `System: ${params.system}\n\n` : "";
    const messages = params.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: params.system
          ? [{ role: "system", content: params.system }, ...messages]
          : messages,
        stream: false,
        options: {
          temperature: params.temperature ?? 0.7,
          num_predict: params.maxTokens ?? 2048,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) throw new Error(`Ollama complete error: ${res.status}`);
    const data = (await res.json()) as {
      message?: { content: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    void systemMsg; // used in messages above

    return {
      content: data.message?.content || "",
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
      stopReason: "end_turn",
    };
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: DEFAULT_EMBED_MODEL, prompt: text }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Ollama embed error: ${res.status}`);
    const data = (await res.json()) as { embedding: number[] };
    return data.embedding;
  }
}
