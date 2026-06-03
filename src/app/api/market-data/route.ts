import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { appNow } from "@/config/timezone";

const marketDataSchema = z.object({
  coinId: z.coerce.number().int().positive(),
  snapshotDate: z.string().min(10),
  priceUsd: z.coerce.number().positive(),
  marketCap: z.coerce.number().nonnegative(),
  volume24h: z.coerce.number().nonnegative(),
});

export async function POST(request: Request) {
  const payload = marketDataSchema.parse(await request.json());
  const snapshotDate = toDateOnly(payload.snapshotDate);
  const now = appNow();

  const row = await prisma.coinMarketData.upsert({
    where: {
      coinId_snapshotDate: {
        coinId: payload.coinId,
        snapshotDate,
      },
    },
    update: {
      priceUsd: payload.priceUsd,
      marketCap: payload.marketCap,
      volume24h: payload.volume24h,
    },
    create: {
      coinId: payload.coinId,
      snapshotDate,
      priceUsd: payload.priceUsd,
      marketCap: payload.marketCap,
      volume24h: payload.volume24h,
      createdAt: now,
    },
  });

  return NextResponse.json({ marketDataId: row.id });
}
