import { prisma } from "@/lib/prisma";

interface PlaygroundDef {
  name: string;
  brainTags: string[];
  teamKeywords: string[];
}

// Keyword lists must cover every team that seedTeams / seedPersonalTeams creates,
// so no seeded team is unreachable from the task router's playground picker.
const CORE_DEFAULTS: PlaygroundDef[] = [
  {
    name: "Development",
    brainTags: ["dev", "code", "development"],
    teamKeywords: ["dev", "code", "tech", "engineer", "product", "design"],
  },
  {
    name: "Research",
    brainTags: ["research", "study", "notes"],
    teamKeywords: ["research", "study", "learn", "intel"],
  },
  {
    name: "Business",
    brainTags: ["business", "ops", "finance", "marketing"],
    teamKeywords: ["business", "finance", "marketing", "sales", "content", "growth", "command"],
  },
];

const PERSONAL_DEFAULT: PlaygroundDef = {
  name: "Personal",
  brainTags: ["personal", "health", "career", "finance"],
  teamKeywords: ["fitness", "health", "job", "cv", "career", "financ", "education", "learning"],
};

/**
 * Seed starter playgrounds wired to the teams the chosen starter pack created.
 * Blank starter seeds nothing — the user builds from scratch.
 */
export async function seedDefaultPlaygrounds(userId: string, starterPack?: string): Promise<void> {
  if (starterPack === "blank") return;

  const count = await prisma.playground.count({ where: { userId } });
  if (count > 0) return;

  const allTeams = await prisma.agentTeam.findMany({
    where: { isSystemTeam: false },
    select: { id: true, name: true },
  });

  const defs = starterPack === "personal"
    ? [PERSONAL_DEFAULT, ...CORE_DEFAULTS]
    : CORE_DEFAULTS;

  for (const def of defs) {
    const matchedIds = allTeams
      .filter(t => def.teamKeywords.some(kw => t.name.toLowerCase().includes(kw)))
      .map(t => t.id);

    await prisma.playground.create({
      data: {
        name: def.name,
        icon: null,
        brainTags: def.brainTags,
        teamIds: matchedIds,
        userId,
      },
    });
  }
}
