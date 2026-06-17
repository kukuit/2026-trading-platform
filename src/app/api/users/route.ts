import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serializers";
import { appNow } from "@/config/timezone";

const userSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startingBalance: z.coerce.number().positive(),
  strategyId: z.string().min(1),
});

export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      strategy: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      description: user.description,
      startingBalance: decimalToNumber(user.startingBalance),
      currentBalance: decimalToNumber(user.currentBalance),
      strategyId: user.strategyId,
      strategy: user.strategy
        ? {
            id: user.strategy.id,
            note: user.strategy.note,
            maxCoinCount: user.strategy.maxCoinCount,
            coinSelectionRule: user.strategy.coinSelectionRule,
            buyRule: user.strategy.buyRule,
            sellRule: user.strategy.sellRule,
          }
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const parsedPayload = userSchema.safeParse(await request.json());
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Invalid user data. Check the name and starting balance." },
      { status: 400 },
    );
  }

  const payload = parsedPayload.data;
  const strategy = await prisma.strategy.findUnique({
    where: { id: payload.strategyId },
  });
  if (!strategy) {
    return NextResponse.json({ error: "Strategy not found." }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      description: payload.description,
      startingBalance: payload.startingBalance,
      currentBalance: payload.startingBalance,
      strategyId: payload.strategyId,
      createdAt: appNow(),
    },
  });

  return NextResponse.json({ userId: user.id });
}
