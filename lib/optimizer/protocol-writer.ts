/**
 * Protocol Writer — post-task evaluator.
 * After each Claude API task completes, this module uses a LOCAL Ollama model
 * (free, zero credits) to evaluate whether the task could be done by a smaller
 * local model in the future. If yes, it writes a reusable protocol to the DB
 * and filesystem.
 */

import { prisma } from "@/lib/prisma";
import * as fs from "fs/promises";
import * as path from "path";

export interface TaskCompletionData {
  userId: string;
  userPrompt: string;
  assistantResponse: string;
  toolsUsed: string[];
  inputTokens: number;
  outputTokens: number;
}

interface OllamaEvaluation {
  canUseLocal: boolean;
  confidence: number;
  reasoning: string;
  recommendedModel: "qwen2.5:0.5b" | "qwen2.5:1.5b" | "qwen2.5:7b" | "claude-sonnet-4-6";
  protocol: {
    name: string;
    category: "classification" | "extraction" | "generation" | "summarization" | "routing" | "formatting";
    taskPattern: string;
    systemPrompt: string;
    instructions: string;
  } | null;
}

const EVAL_SYSTEM = `You are a task efficiency analyst for an AI automation platform. Your goal: determine whether completed tasks could be handled by a tiny, free local LLM instead of the expensive Claude API.

LOCAL LLMs (qwen2.5 mini models) excel at:
- Classification, categorization, tagging, yes/no decisions
- Structured data extraction from well-defined formats
- Template filling, formatting, conversion between formats
- Short summarization (under 300 words output)
- Repeating pattern tasks with known structure
- Simple code generation for fixed patterns

LOCAL LLMs CANNOT handle:
- Tasks requiring current/real-time information
- Multi-step reasoning across many concepts
- Web browsing or external API calls
- Long-form creative or analytical writing
- Novel problem solving requiring broad knowledge
- Tasks where context > 1500 tokens input

When writing a protocol's systemPrompt: be extremely specific about what the model should and should not do. Local models need tight instructions.

When writing taskPattern: create a regex that captures the ESSENCE of similar prompts (not too specific, not too broad).

Respond ONLY with valid JSON.`;

/**
 * Evaluate a completed task and write a protocol if it can be done locally.
 * Uses local Ollama qwen2.5:7b — zero API cost.
 * Returns true if a protocol was created or updated.
 */
export async function evaluateAndWriteProtocol(data: TaskCompletionData): Promise<boolean> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";

  const evalPrompt = `Evaluate this completed Claude API task and determine if a small local LLM could handle similar tasks.

TASK PROMPT (first 700 chars):
${data.userPrompt.slice(0, 700)}

RESPONSE PREVIEW (first 400 chars):
${data.assistantResponse.slice(0, 400)}

TOOLS USED: ${data.toolsUsed.length > 0 ? data.toolsUsed.join(", ") : "none"}
INPUT TOKENS: ${data.inputTokens}
OUTPUT TOKENS: ${data.outputTokens}

Respond with this exact JSON structure:
{
  "canUseLocal": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "one sentence why or why not",
  "recommendedModel": "qwen2.5:0.5b" | "qwen2.5:1.5b" | "qwen2.5:7b" | "claude-sonnet-4-6",
  "protocol": {
    "name": "Short Protocol Name (3-5 words)",
    "category": "classification|extraction|generation|summarization|routing|formatting",
    "taskPattern": "regex_pattern_matching_similar_prompts",
    "systemPrompt": "Specific system prompt for the local model (2-4 sentences, very directive)",
    "instructions": "1. Step one\\n2. Step two\\n3. Step three (3-5 steps)"
  }
}

Set protocol to null if canUseLocal is false.`;

  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5:7b",
        messages: [
          { role: "system", content: EVAL_SYSTEM },
          { role: "user", content: evalPrompt },
        ],
        stream: false,
        format: "json",
        options: { temperature: 0.1 }, // low temp for consistent structured output
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      console.log("[protocol-writer] Ollama unavailable, skipping evaluation");
      return false;
    }

    const raw = (await res.json()) as { message?: { content?: string } };
    const content = raw.message?.content;
    if (!content) return false;

    let evaluation: OllamaEvaluation;
    try {
      evaluation = JSON.parse(content) as OllamaEvaluation;
    } catch {
      console.error("[protocol-writer] Failed to parse Ollama JSON response");
      return false;
    }

    // Only write protocol if confident enough and useful
    if (!evaluation.canUseLocal || evaluation.confidence < 0.70 || !evaluation.protocol) {
      return false;
    }

    // Skip if uses tools that can't run locally
    if (data.toolsUsed.some((t) => ["web_search", "web_browse"].includes(t))) {
      return false;
    }

    const proto = evaluation.protocol;
    const estimatedSaving = estimateCreditSaving(data.inputTokens, data.outputTokens);

    // Check for duplicate protocol
    const existing = await prisma.taskProtocol.findFirst({
      where: {
        name: { contains: proto.name.slice(0, 25), mode: "insensitive" },
        active: true,
      },
    });

    if (existing) {
      // Reinforce existing protocol — update confidence and saving
      await prisma.taskProtocol.update({
        where: { id: existing.id },
        data: {
          confidence: parseFloat(
            Math.min(0.98, (existing.confidence + evaluation.confidence) / 2).toFixed(3)
          ),
          successCount: { increment: 1 },
          estimatedSaving: Math.max(existing.estimatedSaving, estimatedSaving),
        },
      });
      return true;
    }

    // Create new protocol
    const created = await prisma.taskProtocol.create({
      data: {
        name: proto.name,
        description: evaluation.reasoning,
        taskPattern: proto.taskPattern,
        localModel: evaluation.recommendedModel,
        systemPrompt: proto.systemPrompt,
        instructions: proto.instructions,
        category: proto.category,
        confidence: evaluation.confidence,
        estimatedSaving,
      },
    });

    // Write markdown file for agent consumption
    await writeProtocolMarkdown(created.id, proto.name, {
      category: proto.category,
      model: evaluation.recommendedModel,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
      taskPattern: proto.taskPattern,
      systemPrompt: proto.systemPrompt,
      instructions: proto.instructions,
      estimatedSaving,
    });

    console.log(`[protocol-writer] New protocol created: "${proto.name}" (${proto.category})`);
    return true;
  } catch (err) {
    console.error("[protocol-writer] Error:", err);
    return false;
  }
}

/** Estimate credits saved per use vs Claude Sonnet pricing */
function estimateCreditSaving(inputTokens: number, outputTokens: number): number {
  // lib/pricing.ts: Sonnet = 3 input + 15 output credits per 1k tokens
  return Math.round((inputTokens / 1000) * 3 + (outputTokens / 1000) * 15);
}

/** Write a human-readable markdown file under data/protocols/ */
async function writeProtocolMarkdown(
  id: string,
  name: string,
  data: {
    category: string;
    model: string;
    confidence: number;
    reasoning: string;
    taskPattern: string;
    systemPrompt: string;
    instructions: string;
    estimatedSaving: number;
  }
): Promise<void> {
  const dir = path.join(process.cwd(), "data", "protocols");
  await fs.mkdir(dir, { recursive: true });

  const md = `# Protocol: ${name}

**Category:** ${data.category}
**Local Model:** \`${data.model}\`
**Confidence:** ${Math.round(data.confidence * 100)}%
**Est. Credits Saved per Use:** ~${data.estimatedSaving}

## When This Protocol Applies
Pattern: \`${data.taskPattern}\`

${data.reasoning}

## System Prompt for Local Model
\`\`\`
${data.systemPrompt}
\`\`\`

## Execution Instructions
${data.instructions}

---
*Auto-generated by AgentPlayground Optimizer | Protocol ID: ${id}*
`;

  await fs.writeFile(path.join(dir, `${id}.md`), md, "utf-8");

  // Register in file_records so the Files UI shows it
  try {
    await prisma.fileRecord.upsert({
      where: { path: `protocols/${id}.md` },
      update: { name: `${name}.md`, size: Buffer.byteLength(md) },
      create: {
        name: `${name}.md`,
        path: `protocols/${id}.md`,
        size: Buffer.byteLength(md),
        mimeType: "text/markdown",
        description: `Optimization protocol: ${data.category} tasks via ${data.model}`,
      },
    });
  } catch {
    // Non-fatal
  }
}
