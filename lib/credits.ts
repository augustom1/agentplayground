import { prisma } from "@/lib/prisma";

// Credits per 1k tokens
const RATES: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7":    { input: 15,   output: 75 },
  "claude-sonnet-4-6":  { input: 3,    output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.25, output: 1.25 },
  "claude-haiku-4-5":   { input: 0.25, output: 1.25 },
};
const DEFAULT_RATE = { input: 3, output: 15 };

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rate = RATES[model] ?? DEFAULT_RATE;
  return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
}

export async function getUserCredits(userId: string) {
  const row = await prisma.userCredits.findUnique({ where: { userId } });
  return {
    balance: row?.balance ?? 0,
    lifetimePurchased: row?.lifetimePurchased ?? 0,
    lifetimeUsed: row?.lifetimeUsed ?? 0,
  };
}

export async function deductCredits(
  userId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<number> {
  const cost = calculateCost(model, inputTokens, outputTokens);
  if (cost <= 0) return 0;
  await prisma.userCredits.upsert({
    where: { userId },
    update: { balance: { decrement: cost }, lifetimeUsed: { increment: cost } },
    create: { userId, balance: -cost, lifetimeUsed: cost },
  });
  return cost;
}

export async function grantCredits(userId: string, amount: number): Promise<void> {
  await prisma.userCredits.upsert({
    where: { userId },
    update: { balance: { increment: amount }, lifetimePurchased: { increment: amount } },
    create: { userId, balance: amount, lifetimePurchased: amount },
  });
}
