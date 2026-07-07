import { getAvailableProvider, defaultModelFor } from "@/lib/providers";
import type { Message, Tool } from "@/lib/providers";
import { executeTool } from "@/lib/chat-tools";

const MAX_TOOL_ITERATIONS = 10;

export const NO_PROVIDER_MESSAGE =
  "No AI provider available. Add an API key in Settings > API Keys (Anthropic, or NVIDIA's free key from build.nvidia.com), or start Ollama for local models.";

export interface ProviderLoopOptions {
  systemPrompt: string;
  userMessage: string;
  tools: Tool[];
  /** Forwarded to request_human_input so the paused task can be resumed. */
  taskId?: string;
  /** Pause the loop when the model calls request_human_input (delegated tasks). */
  interceptHumanInput?: boolean;
  maxIterations?: number;
}

export interface ProviderLoopOutcome {
  /** false = no provider available at all — content holds the friendly message. */
  ok: boolean;
  content: string;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  model: string;
  toolsUsed: string[];
  needsInput: { question: string; context?: string } | null;
}

/**
 * Tool loop over the provider abstraction (lib/providers) — runs delegated and plan
 * tasks on NVIDIA / OpenAI / local Ollama when no Anthropic key exists.
 * CompletionParams messages are string-only, so tool results are fed back as plain
 * text turns; models that reject the tools param degrade to a single-shot answer.
 */
export async function runProviderToolLoop(opts: ProviderLoopOptions): Promise<ProviderLoopOutcome> {
  const provider = await getAvailableProvider();
  if (!provider) {
    return {
      ok: false, content: NO_PROVIDER_MESSAGE, inputTokens: 0, outputTokens: 0,
      provider: "none", model: "none", toolsUsed: [], needsInput: null,
    };
  }

  const model = defaultModelFor(provider);
  const maxIter = opts.maxIterations ?? MAX_TOOL_ITERATIONS;

  const messages: Message[] = [{ role: "user", content: opts.userMessage }];
  let fullText = "";
  let totalInput = 0;
  let totalOutput = 0;
  const toolsUsed: string[] = [];
  let needsInput: { question: string; context?: string } | null = null;
  let tools: Tool[] | undefined = opts.tools.length ? opts.tools : undefined;

  for (let i = 0; i < maxIter; i++) {
    let result;
    try {
      result = await provider.complete({ model, messages, system: opts.systemPrompt, maxTokens: 4096, tools });
    } catch (err) {
      if (tools) {
        // Some free NVIDIA NIM models reject the tools param — retry without tools
        tools = undefined;
        result = await provider.complete({ model, messages, system: opts.systemPrompt, maxTokens: 4096 });
      } else {
        throw err;
      }
    }

    totalInput += result.inputTokens;
    totalOutput += result.outputTokens;
    if (result.content) fullText += result.content + "\n";

    if (!result.toolCalls?.length) break;

    const resultLines: string[] = [];
    for (const call of result.toolCalls) {
      toolsUsed.push(call.name);
      if (opts.interceptHumanInput && call.name === "request_human_input") {
        // Execute to emit SSE + update DB, then pause the loop
        await executeTool(call.name, { ...call.input, taskId: opts.taskId });
        needsInput = {
          question: String(call.input.question ?? ""),
          context: call.input.context as string | undefined,
        };
        break;
      }
      const toolResult = await executeTool(call.name, call.input);
      resultLines.push(`[Tool ${call.name} result]\n${toolResult}`);
    }
    if (needsInput) break;

    messages.push({
      role: "assistant",
      content: `${result.content || ""}\n[Called tools: ${result.toolCalls.map((c) => c.name).join(", ")}]`.trim(),
    });
    messages.push({
      role: "user",
      content: `${resultLines.join("\n\n")}\n\nContinue the task with these tool results. When finished, give your final answer.`,
    });
  }

  return {
    ok: true,
    content: fullText.trim(),
    inputTokens: totalInput,
    outputTokens: totalOutput,
    provider: provider.id,
    model,
    toolsUsed,
    needsInput,
  };
}
