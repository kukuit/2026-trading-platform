import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serializers";
import { hasStrategyInput, normalizeStrategyInput } from "@/lib/strategyInput";
import { appNow } from "@/config/timezone";

const userSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  startingBalance: z.coerce.number().positive(),
  maxCoinCount: z.coerce.number().int().positive().nullable().optional(),
  coinSelectionRule: z.string().trim().nullable().optional(),
  buyRule: z.string().trim().nullable().optional(),
  sellRule: z.string().trim().nullable().optional(),
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
      status: user.status,
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
      { error: "Invalid user data. Check the account and strategy fields." },
      { status: 400 },
    );
  }

  const payload = parsedPayload.data;
  const user = await prisma.$transaction(async (tx) => {
    const strategy = hasStrategyInput(payload)
      ? await tx.strategy.create({
          data: normalizeStrategyInput(payload),
        })
      : null;

    return tx.user.create({
      data: {
        name: payload.name,
        description: payload.description,
        startingBalance: payload.startingBalance,
        currentBalance: payload.startingBalance,
        status: 1,
        strategyId: strategy?.id ?? null,
        createdAt: appNow(),
      },
    });
  });

  return NextResponse.json({ userId: user.id });
}
