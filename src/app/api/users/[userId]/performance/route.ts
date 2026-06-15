import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appDateOnly, appTodayInput } from "@/config/timezone";
import { decimalToNumber } from "@/lib/serializers";

export const dynamic = "force-dynamic";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateLabel(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const today = appDateOnly(appTodayInput());
  const startDate = addDays(today, -29);
  const endExclusive = addDays(today, 1);

  const trades = await prisma.trade.findMany({
    where: {
      userId: user.id,
      createdAt: { lt: endExclusive },
    },
    orderBy: { createdAt: "asc" },
  });

  const coinIds = Array.from(new Set(trades.map((trade) => trade.coinId)));
  const marketRows = coinIds.length
    ? await prisma.coinMarketData.findMany({
        where: {
          coinId: { in: coinIds },
          snapshotDate: { lt: endExclusive },
        },
        orderBy: [{ snapshotDate: "asc" }, { id: "asc" }],
      })
    : [];

  let tradeIndex = 0;
  let marketIndex = 0;
  let cashBalance = decimalToNumber(user.startingBalance);
  const holdings = new Map<number, number>();
  const latestPrices = new Map<number, number>();

  const points = Array.from({ length: 30 }, (_, index) => {
    const day = addDays(startDate, index);
    const nextDay = addDays(day, 1);

    while (tradeIndex < trades.length && trades[tradeIndex].createdAt < nextDay) {
      const trade = trades[tradeIndex];
      const tradeQuantity = decimalToNumber(trade.quantity);
      const tradeAmount = decimalToNumber(trade.totalAmount);
      const currentQuantity = holdings.get(trade.coinId) ?? 0;

      if (trade.type === "BUY") {
        cashBalance -= tradeAmount;
        holdings.set(trade.coinId, currentQuantity + tradeQuantity);
      } else {
        cashBalance += tradeAmount;
        holdings.set(trade.coinId, Math.max(currentQuantity - tradeQuantity, 0));
      }

      tradeIndex += 1;
    }

    while (marketIndex < marketRows.length && marketRows[marketIndex].snapshotDate < nextDay) {
      const marketRow = marketRows[marketIndex];
      latestPrices.set(marketRow.coinId, decimalToNumber(marketRow.priceUsd));
      marketIndex += 1;
    }

    const assetValue = Array.from(holdings.entries()).reduce((sum, [coinId, coinQuantity]) => {
      return sum + coinQuantity * (latestPrices.get(coinId) ?? 0);
    }, 0);
    const totalValue = cashBalance + assetValue;

    return {
      date: dateLabel(day),
      cashBalance,
      assetValue,
      totalValue,
    };
  });

  const values = points.map((point) => point.totalValue);
  const currentValue = values.at(-1) ?? 0;
  const firstValue = values[0] ?? currentValue;
  const totalReturn = firstValue > 0 ? ((currentValue - firstValue) / firstValue) * 100 : 0;

  return NextResponse.json({
    points,
    stats: {
      totalReturn,
      currentValue,
      highestValue: values.length ? Math.max(...values) : 0,
      lowestValue: values.length ? Math.min(...values) : 0,
    },
  });
}
