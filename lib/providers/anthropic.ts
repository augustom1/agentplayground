import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, CompletionParams, CompletionResult } from "./types";

export class AnthropicProvider implements LLMProvider {
  id = "anthropic";
  name = "Anthropic";
  type = "anthropic" as const;

  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }

  async models(): Promise<string[]> {
    return [
      "claude-opus-4-7",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
    ];
  }

  async complete(params: CompletionParams): Promise<CompletionResult> {
    const response = await this.client.messages.create({
      model: params.model || "claude-sonnet-4-6",
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature,
      system: params.system,
      messages: params.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools: params.tools as Anthropic.Tool[] | undefined,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

    return {
      content: textBlock?.type === "text" ? textBlock.text : "",
      toolCalls:
        toolUseBlocks.length > 0
          ? toolUseBlocks.map((b) =>
              b.type === "tool_use"
                ? { name: b.name, input: b.input as Record<string, unknown> }
                : { name: "", input: {} }
            )
          : undefined,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason ?? "end_turn",
    };
  }

  async embed(text: string): Promise<number[]> {
    // Anthropic doesn't have an embedding API — delegate to Ollama
    const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
    const res = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Ollama embed fallback failed: ${res.status}`);
    const data = (await res.json()) as { embedding: number[] };
    return data.embedding;
  }
}
