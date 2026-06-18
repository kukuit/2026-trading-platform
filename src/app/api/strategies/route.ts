import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const strategySchema = z.object({
  note: z.string().optional().nullable(),
  maxCoinCount: z.coerce.number().int().positive().nullable().optional(),
  coinSelectionRule: z.string().trim().nullable().optional(),
  buyRule: z.string().trim().nullable().optional(),
  sellRule: z.string().trim().nullable().optional(),
});

function serializeStrategy(strategy: {
  id: string;
  note: string | null;
  maxCoinCount: number | null;
  coinSelectionRule: string | null;
  buyRule: string | null;
  sellRule: string | null;
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

export async function GET() {
  const strategies = await prisma.strategy.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ strategies: strategies.map(serializeStrategy) });
}

export async function POST(request: Request) {
  const parsedPayload = strategySchema.safeParse(await request.json());
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Invalid strategy data. Check rule fields and max coin count." },
      { status: 400 },
    );
  }

  const payload = parsedPayload.data;
  const strategy = await prisma.strategy.create({
    data: {
      note: payload.note?.trim() || null,
      maxCoinCount: payload.maxCoinCount,
      coinSelectionRule: payload.coinSelectionRule || null,
      buyRule: payload.buyRule || null,
      sellRule: payload.sellRule || null,
    },
  });

  return NextResponse.json({ strategy: serializeStrategy(strategy) }, { status: 201 });
}
