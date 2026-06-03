import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  const trades = await prisma.trade.findMany({
    where: { userId: params.userId },
    include: { coin: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    trades: trades.map((trade) => ({
      id: trade.id,
      date: trade.createdAt.toISOString(),
      coinId: trade.coinId,
      symbol: trade.coin.symbol,
      name: trade.coin.name,
      type: trade.type,
      quantity: decimalToNumber(trade.quantity),
      priceUsd: decimalToNumber(trade.priceUsd),
      totalAmount: decimalToNumber(trade.totalAmount),
    })),
  });
}
