import { prisma } from "@/lib/prisma";

export async function retrieveMemories(
  ownerId: string,
  ownerType: string,
  limit = 10
): Promise<string> {
  const now = new Date();
  const memories = await prisma.agentMemory.findMany({
    where: {
      ownerId,
      ownerType,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ importance: "desc" }, { accessedAt: "desc" }],
    take: limit,
  });

  if (memories.length === 0) return "";

  // Update accessedAt for retrieved records
  await prisma.agentMemory.updateMany({
    where: { id: { in: memories.map((m) => m.id) } },
    data: { accessedAt: now },
  });

  const lines = memories
    .map((m) => `- [${m.memoryType}] ${m.content}`)
    .join("\n");

  return `## Keeper Memory\n${lines}`;
}
