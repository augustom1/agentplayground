import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      createdAt: true,
      credits: { select: { balance: true, lifetimePurchased: true, lifetimeUsed: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      plan: u.plan,
      createdAt: u.createdAt,
      balance: u.credits?.balance ?? 0,
      lifetimePurchased: u.credits?.lifetimePurchased ?? 0,
      lifetimeUsed: u.credits?.lifetimeUsed ?? 0,
    }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, amount } = await req.json();
  if (!userId || typeof amount !== "number" || amount <= 0) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  await grantCredits(userId, amount);
  return Response.json({ ok: true });
}
