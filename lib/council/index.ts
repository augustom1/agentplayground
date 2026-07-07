import { getProvider, defaultModelFor } from "@/lib/providers";
import { OllamaProvider } from "@/lib/providers/ollama";
import { prisma } from "@/lib/prisma";

export type ThinkingPreset = "fast" | "balanced" | "deep";

export interface CouncilMeeting {
  context: string;
  topic: string;
  participants: string[];
  rounds?: number;
  planId?: string;
  /** Reasoning depth:
   *  - "fast"     = 1 round, Ollama local, zero API cost
   *  - "balanced" = 2 rounds, Claude API (default)
   *  - "deep"     = 3 rounds, Claude API + extended thinking
   */
  thinkingPreset?: ThinkingPreset;
}

export interface Amendment {
  taskRef: string;
  type: "add" | "remove" | "modify" | "reorder";
  description: string;
  proposedBy: string;
  accepted: boolean;
}

export interface TaskRouting {
  taskRef: string;
  provider: "local" | "api";
  model?: string;
  reason: string;
}

export interface CouncilOutput {
  amendments: Amendment[];
  riskFlags: string[];
  consensusScore: number;
  transcript: string;
  taskRouting: TaskRouting[];
}

const FACILITATOR_SYSTEM = `You are the Playground Keeper facilitating a Council review.
Your job: extract concrete amendments, risk flags, and task routing from the debate.
Do not add your own opinions. Summarize and converge.
Output ONLY valid JSON matching this schema exactly:
{
  "amendments": [{ "taskRef": "string", "type": "add|remove|modify|reorder", "description": "string", "proposedBy": "string", "accepted": true }],
  "riskFlags": ["string"],
  "consensusScore": 0.0,
  "taskRouting": [{ "taskRef": "string", "provider": "local|api", "model": "string", "reason": "string" }]
}
For taskRouting: classify every task mentioned. Use provider="local" when the task is a summary, classification, simple draft, or formatting — a 7B model can do it at zero cost. Use provider="api" for complex reasoning, code architecture, strategic decisions, or anything requiring creativity or deep analysis.`;

function participantPrompt(teamName: string, capabilities: string[]): string {
  return `You are the ${teamName} team lead in a Council review.
Your team handles: ${capabilities.join(", ")}.
Review the following plan from your team's perspective.
Identify: missing tasks for your domain, risks, dependencies not listed, missing inputs.
For each task you review or propose, also state whether it needs API-level reasoning (complex) or could be handled by a local 7B model (routine).
Be specific. Propose concrete amendments. Keep your response under 200 words.`;
}

interface ParticipantConfig {
  maxTokens: number;
  temperature: number;
  useLocal: boolean;
  thinking?: { type: "enabled"; budget_tokens: number };
}

function presetConfig(preset: ThinkingPreset): { rounds: number; participant: ParticipantConfig; facilitator: ParticipantConfig } {
  switch (preset) {
    case "fast":
      return {
        rounds: 1,
        participant: { maxTokens: 200, temperature: 0.3, useLocal: true },
        facilitator: { maxTokens: 600, temperature: 0.3, useLocal: true },
      };
    case "deep":
      return {
        rounds: 3,
        participant: { maxTokens: 500, temperature: 0.5, useLocal: false, thinking: { type: "enabled", budget_tokens: 3000 } },
        facilitator: { maxTokens: 1500, temperature: 1, useLocal: false, thinking: { type: "enabled", budget_tokens: 5000 } },
      };
    default: // balanced
      return {
        rounds: 2,
        participant: { maxTokens: 400, temperature: 0.4, useLocal: false },
        facilitator: { maxTokens: 1000, temperature: 0.2, useLocal: false },
      };
  }
}

async function runParticipant(
  teamName: string,
  capabilities: string[],
  context: string,
  previousAmendments: string,
  config: ParticipantConfig
): Promise<string> {
  const provider = config.useLocal
    ? new OllamaProvider()
    : await getProvider("council");

  const result = await provider.complete({
    model: config.useLocal ? "qwen2.5:7b" : defaultModelFor(provider),
    system: participantPrompt(teamName, capabilities),
    messages: [
      {
        role: "user",
        content: `PLAN TO REVIEW:\n${context}${previousAmendments ? `\n\nAMENDMENTS SO FAR:\n${previousAmendments}` : ""}`,
      },
    ],
    maxTokens: config.maxTokens,
    temperature: config.useLocal ? config.temperature : undefined,
    thinking: config.thinking,
  });
  return result.content;
}

export async function runCouncil(meeting: CouncilMeeting): Promise<CouncilOutput> {
  const preset = meeting.thinkingPreset ?? "balanced";
  const cfg = presetConfig(preset);
  const rounds = meeting.rounds ?? cfg.rounds;
  const transcriptParts: string[] = [];

  transcriptParts.push(`[Council: ${preset.toUpperCase()} mode · ${rounds} round(s)]\n`);

  const teams = await prisma.agentTeam.findMany({
    where: { id: { in: meeting.participants } },
    select: { id: true, name: true, permissions: true },
  });

  if (teams.length === 0) {
    return {
      amendments: [],
      riskFlags: ["No teams found for council review"],
      consensusScore: 0.5,
      transcript: "No teams available for review.",
      taskRouting: [],
    };
  }

  let allAmendments = "";

  for (let round = 1; round <= rounds; round++) {
    transcriptParts.push(`\n=== ROUND ${round} ===\n`);

    for (const team of teams) {
      const capabilities = team.permissions ?? [];
      const response = await runParticipant(
        team.name,
        capabilities,
        meeting.context,
        allAmendments,
        cfg.participant
      );
      transcriptParts.push(`**${team.name}:** ${response}\n`);
      allAmendments += `\n${team.name}: ${response}`;
    }
  }

  // Facilitator synthesizes final output
  const facilitatorProvider = cfg.facilitator.useLocal
    ? new OllamaProvider()
    : await getProvider("keeper");

  const facilitatorResult = await facilitatorProvider.complete({
    model: cfg.facilitator.useLocal ? "qwen2.5:7b" : defaultModelFor(facilitatorProvider),
    system: FACILITATOR_SYSTEM,
    messages: [
      {
        role: "user",
        content: `COUNCIL TRANSCRIPT:\n${transcriptParts.join("")}\n\nOriginal plan:\n${meeting.context}`,
      },
    ],
    maxTokens: cfg.facilitator.maxTokens,
    temperature: cfg.facilitator.thinking ? undefined : cfg.facilitator.temperature,
    thinking: cfg.facilitator.thinking,
  });

  let output: CouncilOutput;
  try {
    const raw = facilitatorResult.content.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    const parsed = JSON.parse(raw) as Partial<CouncilOutput & { taskRouting?: TaskRouting[] }>;
    output = {
      amendments: parsed.amendments ?? [],
      riskFlags: parsed.riskFlags ?? [],
      consensusScore: parsed.consensusScore ?? 0.7,
      transcript: transcriptParts.join(""),
      taskRouting: parsed.taskRouting ?? [],
    };
  } catch {
    output = {
      amendments: [],
      riskFlags: ["Council output parsing failed"],
      consensusScore: 0.5,
      transcript: transcriptParts.join(""),
      taskRouting: [],
    };
  }

  return output;
}
