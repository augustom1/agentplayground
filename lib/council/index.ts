import { getProvider } from "@/lib/providers";
import { prisma } from "@/lib/prisma";

export interface CouncilMeeting {
  context: string;       // plan JSON or progress snapshot
  topic: string;         // "review plan" | "mid-project sync" | custom
  participants: string[]; // AgentTeam IDs
  rounds?: number;       // default 2
  planId?: string;
}

export interface Amendment {
  taskRef: string;
  type: "add" | "remove" | "modify" | "reorder";
  description: string;
  proposedBy: string;  // team name
  accepted: boolean;
}

export interface CouncilOutput {
  amendments: Amendment[];
  riskFlags: string[];
  consensusScore: number;  // 0-1
  transcript: string;
}

const FACILITATOR_SYSTEM = `You are the Playground Keeper facilitating a Council review.
Your job: extract concrete amendments and risk flags from the debate.
Do not add your own opinions. Summarize and converge.
Output ONLY valid JSON matching this schema:
{
  "amendments": [{ "taskRef": "string", "type": "add|remove|modify|reorder", "description": "string", "proposedBy": "string", "accepted": true }],
  "riskFlags": ["string"],
  "consensusScore": 0.0
}`;

function participantPrompt(teamName: string, capabilities: string[]): string {
  return `You are the ${teamName} team lead in a Council review.
Your team handles: ${capabilities.join(", ")}.
Review the following plan from your team's perspective.
Identify: missing tasks for your domain, risks, dependencies not listed, missing inputs.
Be specific. Propose concrete amendments. Keep your response under 150 words.`;
}

async function runParticipant(
  teamName: string,
  capabilities: string[],
  context: string,
  previousAmendments: string
): Promise<string> {
  const provider = await getProvider("council");
  const result = await provider.complete({
    model: "claude-sonnet-4-6",
    system: participantPrompt(teamName, capabilities),
    messages: [
      {
        role: "user",
        content: `PLAN TO REVIEW:\n${context}${previousAmendments ? `\n\nAMENDMENTS SO FAR:\n${previousAmendments}` : ""}`,
      },
    ],
    maxTokens: 400,
    temperature: 0.4,
  });
  return result.content;
}

export async function runCouncil(meeting: CouncilMeeting): Promise<CouncilOutput> {
  const rounds = meeting.rounds ?? 2;
  const transcriptParts: string[] = [];

  // Load teams
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
    };
  }

  let allAmendments = "";

  for (let round = 1; round <= rounds; round++) {
    transcriptParts.push(`\n=== ROUND ${round} ===\n`);

    for (const team of teams) {
      const capabilities = team.permissions ?? [];
      const response = await runParticipant(team.name, capabilities, meeting.context, allAmendments);
      transcriptParts.push(`**${team.name}:** ${response}\n`);
      allAmendments += `\n${team.name}: ${response}`;
    }
  }

  // Facilitator produces final output
  const facilitator = await getProvider("keeper");
  const facilitatorResult = await facilitator.complete({
    model: "claude-sonnet-4-6",
    system: FACILITATOR_SYSTEM,
    messages: [
      {
        role: "user",
        content: `COUNCIL TRANSCRIPT:\n${transcriptParts.join("")}\n\nOriginal plan:\n${meeting.context}`,
      },
    ],
    maxTokens: 1000,
    temperature: 0.2,
  });

  let output: CouncilOutput;
  try {
    const raw = facilitatorResult.content.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    const parsed = JSON.parse(raw) as Partial<CouncilOutput>;
    output = {
      amendments: parsed.amendments ?? [],
      riskFlags: parsed.riskFlags ?? [],
      consensusScore: parsed.consensusScore ?? 0.7,
      transcript: transcriptParts.join(""),
    };
  } catch {
    output = {
      amendments: [],
      riskFlags: ["Council output parsing failed"],
      consensusScore: 0.5,
      transcript: transcriptParts.join(""),
    };
  }

  return output;
}
