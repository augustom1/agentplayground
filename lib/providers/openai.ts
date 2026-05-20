import OpenAI from "openai";
import type { LLMProvider, CompletionParams, CompletionResult } from "./types";

export class OpenAIProvider implements LLMProvider {
  id: string;
  name: string;
  type = "openai" as const;

  private client: OpenAI;

  constructor(opts?: { apiKey?: string; baseUrl?: string; name?: string; id?: string }) {
    this.id = opts?.id || "openai";
    this.name = opts?.name || "OpenAI";
    this.client = new OpenAI({
      apiKey: opts?.apiKey || process.env.OPENAI_API_KEY,
      baseURL: opts?.baseUrl,
    });
  }

  async models(): Promise<string[]> {
    return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
  }

  async complete(params: CompletionParams): Promise<CompletionResult> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (params.system) {
      messages.push({ role: "system", content: params.system });
    }
    messages.push(
      ...params.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );

    const tools = params.tools?.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: params.model || "gpt-4o-mini",
      max_tokens: params.maxTokens || 4096,
      temperature: params.temperature,
      messages,
      tools: tools?.length ? tools : undefined,
    });

    const choice = response.choices[0];
    const message = choice.message;
    const toolCalls = message.tool_calls?.map((tc) => {
      const fn = (tc as { function?: { name: string; arguments: string } }).function;
      return {
        name: fn?.name ?? "",
        input: JSON.parse(fn?.arguments || "{}") as Record<string, unknown>,
      };
    });

    return {
      content: message.content || "",
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      stopReason: choice.finish_reason || "end_turn",
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  }
}
