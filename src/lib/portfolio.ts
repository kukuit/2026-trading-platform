import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serializers";

export async function getLatestMarketRows(coinIds?: number[]) {
  const rows = await prisma.coinMarketData.findMany({
    where: coinIds?.length ? { coinId: { in: coinIds } } : undefined,
    orderBy: [{ snapshotDate: "desc" }, { id: "desc" }],
  });

  const latest = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.coinId)) latest.set(row.coinId, row);
  }
  return latest;
}

export async function getPortfolio(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    include: { coin: true },
    orderBy: { updatedAt: "desc" },
  });

  const latestMarket = await getLatestMarketRows(holdings.map((holding) => holding.coinId));

  return holdings
    .map((holding) => {
      const quantity = decimalToNumber(holding.quantity);
      const avgPrice = decimalToNumber(holding.avgPrice);
      const latest = latestMarket.get(holding.coinId);
      const currentPrice = latest ? decimalToNumber(latest.priceUsd) : 0;
      const marketValue = quantity * currentPrice;
      const costBasis = quantity * avgPrice;
      const unrealizedPnl = marketValue - costBasis;
      const unrealizedPnlPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

      return {
        id: holding.id,
        coinId: holding.coinId,
        symbol: holding.coin.symbol,
        name: holding.coin.name,
        quantity,
        avgPrice,
        currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct,
      };
    })
    .filter((holding) => holding.quantity > 0);
}

export async function getAssetValue(userId: string) {
  const portfolio = await getPortfolio(userId);
  return portfolio.reduce((sum, holding) => sum + holding.marketValue, 0);
}
