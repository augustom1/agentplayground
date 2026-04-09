/**
 * Task Classifier — zero-cost, rules-based.
 * Determines if a task can be handled by a local Ollama model
 * instead of the Claude API, and which model to use.
 */

import { prisma } from "@/lib/prisma";

export interface ClassificationResult {
  canUseLocal: boolean;
  confidence: number;
  recommendedModel: string;
  reason: string;
  existingProtocolId?: string;
}

interface TaskSignals {
  prompt: string;
  toolsUsed?: string[];
  inputTokens?: number;
  outputTokens?: number;
}

// Signals that REQUIRE the Claude API (scored negatively)
const API_REQUIRED: Array<{ test: (s: TaskSignals) => boolean; label: string }> = [
  {
    test: (s) => (s.toolsUsed ?? []).some((t) => ["web_search", "web_browse"].includes(t)),
    label: "uses live web tools",
  },
  {
    test: (s) => (s.toolsUsed ?? []).length > 4,
    label: "long tool chain (>4 tools)",
  },
  {
    test: (s) => (s.inputTokens ?? 0) > 3000,
    label: "large input context (>3k tokens)",
  },
  {
    test: (s) => (s.outputTokens ?? 0) > 2000,
    label: "long-form output (>2k tokens)",
  },
  {
    test: (s) =>
      /\b(analyz[ei]|synthesize|compare .{5,} with|architect|design a system|research strategy|multi.?step plan)\b/i.test(
        s.prompt
      ),
    label: "complex reasoning / system design",
  },
  {
    test: (s) =>
      /\b(latest|current events|today|this week|breaking news|real.?time|what happened recently)\b/i.test(
        s.prompt
      ),
    label: "requires current/real-time information",
  },
];

// Signals that suggest LOCAL is sufficient (scored positively)
const LOCAL_CAPABLE: Array<{
  test: (s: TaskSignals) => boolean;
  model: string;
  label: string;
  weight: number;
}> = [
  {
    test: (s) => /\b(classify|categorize|label|tag|is this a|what type of|which category)\b/i.test(s.prompt),
    model: "qwen2.5:0.5b",
    label: "classification task",
    weight: 2,
  },
  {
    test: (s) => /\b(extract|parse out|find all|list the|identify the|get the \w+ from)\b/i.test(s.prompt),
    model: "qwen2.5:1.5b",
    label: "extraction task",
    weight: 2,
  },
  {
    test: (s) =>
      /\b(reformat|convert to|transform into|restructure|translate into \w+ format)\b/i.test(s.prompt),
    model: "qwen2.5:1.5b",
    label: "formatting / transformation task",
    weight: 2,
  },
  {
    test: (s) =>
      /\b(summarize|brief summary|tl;?dr|overview of|in one paragraph|key points from)\b/i.test(s.prompt),
    model: "qwen2.5:7b",
    label: "summarization task",
    weight: 1,
  },
  {
    test: (s) =>
      /\b(create (an? )?(agent|team|skill|chatbot)|add (an? )?(agent|skill)|schedule (a )?task)\b/i.test(
        s.prompt
      ),
    model: "qwen2.5:7b",
    label: "structured platform creation task",
    weight: 1,
  },
  {
    test: (s) => (s.inputTokens ?? 9999) < 300,
    model: "qwen2.5:0.5b",
    label: "very short input (<300 tokens)",
    weight: 1,
  },
  {
    test: (s) => (s.toolsUsed ?? []).length === 0,
    model: "qwen2.5:7b",
    label: "no tool usage",
    weight: 1,
  },
  {
    test: (s) => /\b(yes or no|true or false|is it|does it|can it|will it)\b/i.test(s.prompt),
    model: "qwen2.5:0.5b",
    label: "binary decision task",
    weight: 2,
  },
];

/**
 * Classify a task. Checks existing protocols first (DB lookup),
 * then falls back to heuristic scoring.
 */
export async function classifyTask(
  signals: TaskSignals,
  checkProtocols = true
): Promise<ClassificationResult> {
  // 1. Check for a matching saved protocol
  if (checkProtocols) {
    try {
      const protocols = await prisma.taskProtocol.findMany({
        where: { active: true },
        select: { id: true, taskPattern: true, localModel: true, confidence: true },
        orderBy: { confidence: "desc" },
        take: 30,
      });

      for (const p of protocols) {
        try {
          const re = new RegExp(p.taskPattern, "i");
          if (re.test(signals.prompt)) {
            return {
              canUseLocal: true,
              confidence: p.confidence,
              recommendedModel: p.localModel,
              reason: "matched existing protocol",
              existingProtocolId: p.id,
            };
          }
        } catch {
          // invalid regex in DB — skip
        }
      }
    } catch {
      // DB error — fall through to heuristics
    }
  }

  // 2. Heuristic scoring
  const apiHits = API_REQUIRED.filter((s) => s.test(signals));
  if (apiHits.length > 0) {
    return {
      canUseLocal: false,
      confidence: Math.min(0.95, 0.6 + apiHits.length * 0.1),
      recommendedModel: "claude-sonnet-4-6",
      reason: `API required — ${apiHits.map((h) => h.label).join("; ")}`,
    };
  }

  const localHits = LOCAL_CAPABLE.filter((s) => s.test(signals));
  if (localHits.length === 0) {
    return {
      canUseLocal: false,
      confidence: 0.55,
      recommendedModel: "claude-sonnet-4-6",
      reason: "No local-capable signals detected — defaulting to API",
    };
  }

  // Pick model: prefer more capable when multiple signals fire
  const totalWeight = localHits.reduce((sum, h) => sum + h.weight, 0);
  const confidence = Math.min(0.92, 0.45 + totalWeight * 0.08);

  // Upgrade model based on weight: heavy tasks need 7b
  const recommendedModel =
    totalWeight >= 4
      ? "qwen2.5:7b"
      : totalWeight >= 2
      ? "qwen2.5:1.5b"
      : "qwen2.5:0.5b";

  return {
    canUseLocal: true,
    confidence,
    recommendedModel,
    reason: `Local capable — ${localHits.map((h) => h.label).join("; ")}`,
  };
}
