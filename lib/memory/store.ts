import { prisma } from "@/lib/prisma";

export interface MemoryEntry {
  ownerType: "agent" | "team" | "project" | "system";
  ownerId: string;
  content: string;
  memoryType: "fact" | "preference" | "decision" | "output";
  importance?: number;
  expiresAt?: Date;
}

export async function storeMemory(entry: MemoryEntry): Promise<void> {
  await prisma.agentMemory.create({
    data: {
      ownerType: entry.ownerType,
      ownerId: entry.ownerId,
      content: entry.content,
      memoryType: entry.memoryType,
      importance: entry.importance ?? 0.5,
      expiresAt: entry.expiresAt ?? null,
      accessedAt: new Date(),
    },
  });
}
