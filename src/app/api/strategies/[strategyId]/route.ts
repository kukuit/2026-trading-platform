import { NextResponse } from "next/server";
import { BuyRule, CoinSelectionRule, Prisma, SellRule } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const strategySchema = z.object({
  note: z.string().optional().nullable(),
  maxCoinCount: z.coerce.number().int().positive(),
  coinSelectionRule: z.nativeEnum(CoinSelectionRule),
  buyRule: z.nativeEnum(BuyRule),
  sellRule: z.nativeEnum(SellRule),
});

function serializeStrategy(strategy: {
  id: string;
  note: string | null;
  maxCoinCount: number;
  coinSelectionRule: CoinSelectionRule;
  buyRule: BuyRule;
  sellRule: SellRule;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: strategy.id,
    note: strategy.note,
    maxCoinCount: strategy.maxCoinCount,
    coinSelectionRule: strategy.coinSelectionRule,
    buyRule: strategy.buyRule,
    sellRule: strategy.sellRule,
    createdAt: strategy.createdAt.toISOString(),
    updatedAt: strategy.updatedAt.toISOString(),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { strategyId: string } },
) {
  const strategy = await prisma.strategy.findUnique({
    where: { id: params.strategyId },
  });

  if (!strategy) return NextResponse.json({ error: "Strategy not found" }, { status: 404 });

  return NextResponse.json({ strategy: serializeStrategy(strategy) });
}

export async function PUT(
  request: Request,
  { params }: { params: { strategyId: string } },
) {
  const parsedPayload = strategySchema.safeParse(await request.json());
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Invalid strategy data. Check rule fields and max coin count." },
      { status: 400 },
    );
  }

  try {
    const payload = parsedPayload.data;
    const strategy = await prisma.strategy.update({
      where: { id: params.strategyId },
      data: {
        note: payload.note?.trim() || null,
        maxCoinCount: payload.maxCoinCount,
        coinSelectionRule: payload.coinSelectionRule,
        buyRule: payload.buyRule,
        sellRule: payload.sellRule,
      },
    });

    return NextResponse.json({ strategy: serializeStrategy(strategy) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { strategyId: string } },
) {
  try {
    await prisma.strategy.delete({ where: { id: params.strategyId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
      }

      if (error.code === "P2003") {
        return NextResponse.json(
          { error: "Strategy is assigned to one or more users." },
          { status: 409 },
        );
      }
    }

    throw error;
  }
}
