export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface CompletionParams {
  model: string;
  messages: Message[];
  system?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: Tool[];
  /** Anthropic extended thinking. When set, temperature is forced to 1. */
  thinking?: { type: "enabled"; budget_tokens: number };
}

export interface CompletionResult {
  content: string;
  toolCalls?: { name: string; input: Record<string, unknown> }[];
  inputTokens: number;
  outputTokens: number;
  stopReason: "end_turn" | "tool_use" | "max_tokens" | string;
}

export interface LLMProvider {
  id: string;
  name: string;
  type: "anthropic" | "openai" | "ollama" | "custom";
  models(): Promise<string[]>;
  complete(params: CompletionParams): Promise<CompletionResult>;
  embed(text: string): Promise<number[]>;
}

export type ProviderRole = "keeper" | "agent" | "embed" | "council";
