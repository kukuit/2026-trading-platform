import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { appTodayInput } from "@/config/timezone";

export const dynamic = "force-dynamic";

const COINGECKO_MARKETS_URL = "https://api.coingecko.com/api/v3/coins/markets";

type CoinGeckoMarket = {
  id: string;
  market_cap: number | null;
};

async function fetchCoinGeckoMarkets(ids: string[]) {
  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: ids.join(","),
    per_page: String(ids.length),
    page: "1",
  });

  const response = await fetch(`${COINGECKO_MARKETS_URL}?${params.toString()}`, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "crypto-paper-trading-platform/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko market cap request failed: ${response.status} ${response.statusText}`);
  }

  const markets = (await response.json()) as CoinGeckoMarket[];
  return new Map(markets.map((market) => [market.id, Number(market.market_cap ?? 0)]));
}

export async function POST() {
  const coins = await prisma.coin.findMany({
    where: {
      coingeckoId: {
        not: null,
      },
    },
    select: {
      id: true,
      coingeckoId: true,
    },
  });

  const coingeckoIds = coins.flatMap((coin) => (coin.coingeckoId ? [coin.coingeckoId] : []));
  const marketCapById = await fetchCoinGeckoMarkets(coingeckoIds);
  const snapshotDate = toDateOnly(appTodayInput());

  const updates = coins.flatMap((coin) => {
    if (!coin.coingeckoId) return [];

    const marketCap = marketCapById.get(coin.coingeckoId);
    if (!marketCap || !Number.isFinite(marketCap)) return [];

    return [
      prisma.coin.update({
        where: {
          id: coin.id,
        },
        data: {
          marketCap,
        },
      }),
      prisma.coinMarketData.updateMany({
        where: {
          coinId: coin.id,
          snapshotDate,
        },
        data: {
          marketCap,
        },
      }),
    ];
  });

  await Promise.all(updates);

  return NextResponse.json({
    updated: updates.length / 2,
  });
}
