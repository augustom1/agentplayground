import { prisma } from "@/lib/prisma";

const DEFAULTS = [
  {
    name: "Development",
    icon: "💻",
    brainTags: ["dev", "code", "development"],
    teamKeywords: ["dev", "code", "tech", "engineer"],
  },
  {
    name: "Research",
    icon: "🔬",
    brainTags: ["research", "study", "notes"],
    teamKeywords: ["research", "study", "learn"],
  },
  {
    name: "Business",
    icon: "💼",
    brainTags: ["business", "ops", "finance", "marketing"],
    teamKeywords: ["business", "ops", "finance", "marketing", "sales"],
  },
];

export async function seedDefaultPlaygrounds(userId: string): Promise<void> {
  const count = await prisma.playground.count({ where: { userId } });
  if (count > 0) return;

  const allTeams = await prisma.agentTeam.findMany({
    where: { isSystemTeam: false },
    select: { id: true, name: true },
  });

  for (const def of DEFAULTS) {
    const matchedIds = allTeams
      .filter(t => def.teamKeywords.some(kw => t.name.toLowerCase().includes(kw)))
      .map(t => t.id);

    await prisma.playground.create({
      data: {
        name: def.name,
        icon: def.icon,
        brainTags: def.brainTags,
        teamIds: matchedIds,
        userId,
      },
    });
  }
}
