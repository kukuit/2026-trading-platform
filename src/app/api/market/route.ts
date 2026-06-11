import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, toDateOnly } from "@/lib/dates";
import { appNow, appTodayInput } from "@/config/timezone";
import { decimalToNumber, percentChange } from "@/lib/serializers";

export const dynamic = "force-dynamic";

const BINANCE_TICKER_24H_URL = "https://api.binance.com/api/v3/ticker/24hr";

type BinanceTicker = {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

type MarketSnapshot = {
  coinId: number;
  snapshotDate: Date;
  priceUsd: number;
  marketCap: number;
  volume24h: number;
};

async function fetchBinanceTickers() {
  const response = await fetch(BINANCE_TICKER_24H_URL, {
    cache: "no-store",
    headers: {
      accept: "application/json",
      "user-agent": "crypto-paper-trading-platform/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Binance ticker request failed: ${response.status} ${response.statusText}`);
  }

  const tickers = (await response.json()) as BinanceTicker[];
  return new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
}

async function persistMarketSnapshot(row: MarketSnapshot, now: Date) {
  const updated = await prisma.coinMarketData.updateMany({
    where: {
      coinId: row.coinId,
      snapshotDate: row.snapshotDate,
    },
    data: {
      priceUsd: row.priceUsd,
      marketCap: row.marketCap,
      volume24h: row.volume24h,
    },
  });

  if (updated.count > 0) return;

  try {
    await prisma.coinMarketData.create({
      data: {
        coinId: row.coinId,
        snapshotDate: row.snapshotDate,
        priceUsd: row.priceUsd,
        marketCap: row.marketCap,
        volume24h: row.volume24h,
        createdAt: now,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      await prisma.coinMarketData.updateMany({
        where: {
          coinId: row.coinId,
          snapshotDate: row.snapshotDate,
        },
        data: {
          priceUsd: row.priceUsd,
          marketCap: row.marketCap,
          volume24h: row.volume24h,
        },
      });
      return;
    }

    throw error;
  }
}

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

  const tickerBySymbol = await fetchBinanceTickers();
  const snapshotDateLabel = appTodayInput();
  const snapshotDate = toDateOnly(snapshotDateLabel);
  const now = appNow();

  const rowsToPersist: MarketSnapshot[] = [];
  const market = coins.map((coin) => {
    const rows = coin.marketData;
    const latest = rows[0];
    const ticker = coin.binancePair ? tickerBySymbol.get(coin.binancePair) : undefined;
    const livePrice = ticker ? Number(ticker.lastPrice) : null;
    const price = livePrice && Number.isFinite(livePrice) ? livePrice : latest ? decimalToNumber(latest.priceUsd) : 0;
    const volume24h = ticker ? Number(ticker.quoteVolume) : latest ? decimalToNumber(latest.volume24h) : 0;
    const marketCap = decimalToNumber(coin.marketCap);
    const latestDate = ticker ? snapshotDate : latest?.snapshotDate;
    const yesterday = latestDate
      ? rows.find((row) => row.snapshotDate.getTime() <= addDays(latestDate, -1).getTime())
      : null;
    const sevenDaysAgo = latestDate
      ? rows.find((row) => row.snapshotDate.getTime() <= addDays(latestDate, -7).getTime())
      : null;
    const change24h = ticker ? Number(ticker.priceChangePercent) : percentChange(price, yesterday ? decimalToNumber(yesterday.priceUsd) : null);

    if (ticker && price > 0) {
      rowsToPersist.push({
        coinId: coin.id,
        snapshotDate,
        priceUsd: price,
        marketCap,
        volume24h: Number.isFinite(volume24h) ? volume24h : 0,
      });
    }

    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      binancePair: coin.binancePair,
      coingeckoId: coin.coingeckoId,
      priceUsd: price,
      change24h: Number.isFinite(change24h) ? change24h : null,
      change7d: percentChange(price, sevenDaysAgo ? decimalToNumber(sevenDaysAgo.priceUsd) : null),
      marketCap,
      volume24h: Number.isFinite(volume24h) ? volume24h : 0,
      snapshotDate: ticker ? snapshotDateLabel : latestDate?.toISOString().slice(0, 10) ?? null,
    };
  });

  await Promise.all(rowsToPersist.map((row) => persistMarketSnapshot(row, now)));

  return NextResponse.json({ market });
}
