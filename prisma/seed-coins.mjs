import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";

const COINGECKO_MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1";
const BINANCE_EXCHANGE_INFO_URL = "https://api.binance.com/api/v3/exchangeInfo";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "crypto-paper-trading-platform/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${url}`);
  }

  return response.json();
}

function getUsdtPairByBaseAsset(symbols) {
  const pairs = new Map();

  for (const pair of symbols) {
    if (
      pair.status === "TRADING" &&
      pair.quoteAsset === "USDT" &&
      pair.isSpotTradingAllowed !== false &&
      typeof pair.baseAsset === "string" &&
      typeof pair.symbol === "string"
    ) {
      pairs.set(pair.baseAsset.toUpperCase(), pair.symbol);
    }
  }

  return pairs;
}

function buildCoins(geckoCoins, usdtPairs) {
  const coins = [];
  const seenSymbols = new Set();

  for (const coin of geckoCoins) {
    const symbol = coin.symbol?.toUpperCase();
    const name = coin.name;
    const coingeckoId = coin.id;
    const marketCap = Number(coin.market_cap ?? 0);

    if (!symbol || !name || !coingeckoId || seenSymbols.has(symbol)) {
      continue;
    }

    const binancePair = usdtPairs.get(symbol);
    if (!binancePair) {
      continue;
    }

    coins.push({
      symbol,
      name,
      coingeckoId,
      binancePair,
      marketCap: Number.isFinite(marketCap) ? marketCap : 0,
    });
    seenSymbols.add(symbol);
  }

  return coins;
}

async function clearCoinTables(client) {
  await client.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  try {
    await client.$executeRawUnsafe("TRUNCATE TABLE `CoinMarketData`");
    await client.$executeRawUnsafe("TRUNCATE TABLE `Holding`");
    await client.$executeRawUnsafe("TRUNCATE TABLE `Trade`");
    await client.$executeRawUnsafe("TRUNCATE TABLE `Coin`");
  } finally {
    await client.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  }
}

export async function seedCoins(client) {
  const ownsClient = !client;
  const db = client ?? new PrismaClient();

  try {
    const [geckoCoins, exchangeInfo] = await Promise.all([
      fetchJson(COINGECKO_MARKETS_URL),
      fetchJson(BINANCE_EXCHANGE_INFO_URL),
    ]);

    const usdtPairs = getUsdtPairByBaseAsset(exchangeInfo.symbols ?? []);
    const coins = buildCoins(geckoCoins, usdtPairs);

    await clearCoinTables(db);

    await db.coin.createMany({
      data: coins,
      skipDuplicates: true,
    });

    return {
      fetchedFromCoinGecko: geckoCoins.length,
      inserted: coins.length,
      skippedWithoutBinanceUsdtPair: geckoCoins.length - coins.length,
    };
  } finally {
    if (ownsClient) {
      await db.$disconnect();
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedCoins()
    .then((result) => {
      console.log(
        `Seeded ${result.inserted}/${result.fetchedFromCoinGecko} CoinGecko top coins with Binance USDT pairs.`,
      );
      console.log(`Skipped without Binance USDT pair: ${result.skippedWithoutBinanceUsdtPair}`);
    })
    .catch(async (error) => {
      console.error(error);
      process.exit(1);
    });
}
