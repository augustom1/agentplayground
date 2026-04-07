/**
 * GET /api/billing — Current user's usage summary and credit balance.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { creditsToUsd } from "@/lib/pricing";

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const [wallet, recentUsage, thisMonthUsage] = await Promise.all([
      prisma.userCredits.findUnique({ where: { userId } }),

      // Last 10 usage records
      prisma.apiUsage.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // This month's total
      prisma.apiUsage.aggregate({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { credits: true },
      }),
    ]);

    const balance = wallet?.balance ?? 0;
    const monthlySpend = thisMonthUsage._sum.credits ?? 0;

    return NextResponse.json({
      balance,
      balanceUsd: creditsToUsd(balance),
      lifetimePurchased: wallet?.lifetimePurchased ?? 0,
      lifetimeUsed: wallet?.lifetimeUsed ?? 0,
      monthlySpendCredits: monthlySpend,
      monthlySpendUsd: creditsToUsd(monthlySpend),
      recentUsage,
    });
  } catch (err) {
    return apiError(err);
  }
}
