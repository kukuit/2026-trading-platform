import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/dates";
import { decimalToNumber, percentChange } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET() {
  const coins = await prisma.coin.findMany({
    include: {
      marketData: {
        orderBy: { snapshotDate: "desc" },
        take: 16,
      },
    },
    orderBy: { symbol: "asc" },
  });

  const market = coins.map((coin) => {
    const rows = coin.marketData;
    const latest = rows[0];
    const latestDate = latest?.snapshotDate;
    const yesterday = latestDate
      ? rows.find((row) => row.snapshotDate.getTime() <= addDays(latestDate, -1).getTime())
      : null;
    const sevenDaysAgo = latestDate
      ? rows.find((row) => row.snapshotDate.getTime() <= addDays(latestDate, -7).getTime())
      : null;
    const price = latest ? decimalToNumber(latest.priceUsd) : 0;

    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      priceUsd: price,
      change24h: percentChange(price, yesterday ? decimalToNumber(yesterday.priceUsd) : null),
      change7d: percentChange(price, sevenDaysAgo ? decimalToNumber(sevenDaysAgo.priceUsd) : null),
      marketCap: latest ? decimalToNumber(latest.marketCap) : 0,
      volume24h: latest ? decimalToNumber(latest.volume24h) : 0,
      snapshotDate: latestDate?.toISOString().slice(0, 10) ?? null,
    };
  });

  return NextResponse.json({ market });
}
