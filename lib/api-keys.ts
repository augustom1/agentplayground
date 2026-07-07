import { prisma } from "@/lib/prisma";

// API key resolver — env first (ignoring empty strings), then AgentMemory
// (keys entered through the setup wizard / Settings → API Keys live there).
export async function getEffectiveApiKey(name: string): Promise<string | undefined> {
  const envVal = process.env[name];
  if (envVal) return envVal;
  const mem = await prisma.agentMemory.findFirst({
    where: { ownerType: "system", ownerId: name },
    select: { content: true },
  });
  return mem?.content ?? undefined;
}
