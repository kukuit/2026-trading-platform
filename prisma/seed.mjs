import { PrismaClient } from "@prisma/client";
import { appNow } from "../timezone.config.mjs";

const prisma = new PrismaClient();

const coins = [
  ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["USDT", "Tether"], ["BNB", "BNB"],
  ["XRP", "XRP"], ["USDC", "USDC"], ["SOL", "Solana"], ["TRX", "TRON"],
  ["HYPE", "Hyperliquid"], ["DOGE", "Dogecoin"], ["ZEC", "Zcash"], ["LEO", "UNUS SED LEO"],
  ["ADA", "Cardano"], ["XLM", "Stellar"], ["LINK", "Chainlink"], ["XMR", "Monero"],
  ["CC", "Canton"], ["TON", "Toncoin"], ["DAI", "Dai"], ["BCH", "Bitcoin Cash"],
  ["USD1", "World Liberty Financial USD"], ["USDe", "Ethena USDe"], ["M", "MemeCore"], ["HBAR", "Hedera"],
  ["LTC", "Litecoin"], ["NEAR", "NEAR Protocol"], ["AVAX", "Avalanche"], ["SUI", "Sui"],
  ["SHIB", "Shiba Inu"], ["PYUSD", "PayPal USD"], ["CRO", "Cronos"], ["XAUt", "Tether Gold"],
  ["USDG", "Global Dollar"], ["TAO", "Bittensor"], ["PAXG", "PAX Gold"], ["MNT", "Mantle"],
  ["ONDO", "Ondo"], ["WLFI", "World Liberty Financial"], ["DOT", "Polkadot"], ["DEXE", "DeXe"],
  ["RLUSD", "Ripple USD"], ["UNI", "Uniswap"], ["OKB", "OKB"], ["ASTER", "Aster"],
  ["H", "Humanity"], ["ICP", "Internet Computer"], ["SKY", "Sky"], ["WLD", "Worldcoin"],
  ["PI", "Pi"], ["USDD", "USDD"], ["BGB", "Bitget Token"], ["PEPE", "Pepe"],
  ["ETC", "Ethereum Classic"], ["AAVE", "Aave"], ["RENDER", "Render"], ["KCS", "KuCoin Token"],
  ["ALGO", "Algorand"], ["POL", "Polygon"], ["MORPHO", "Morpho"], ["ATOM", "Cosmos"],
  ["U", "United Stables"], ["ENA", "Ethena"], ["QNT", "Quant"], ["VVV", "Venice Token"],
  ["STABLE", "Stable"], ["KAS", "Kaspa"], ["GT", "GateToken"], ["JST", "JUST"],
  ["FIL", "Filecoin"], ["APT", "Aptos"], ["INJ", "Injective"], ["JUP", "Jupiter"],
  ["XDC", "XDC Network"], ["币安人生", "币安人生"], ["FLR", "Flare"], ["NIGHT", "Midnight"],
  ["PUMP", "Pump.fun"], ["ARB", "Arbitrum"], ["FET", "Artificial Superintelligence Alliance"], ["NEXO", "Nexo"],
  ["DASH", "Dash"], ["TUSD", "TrueUSD"], ["VET", "VeChain"], ["VIRTUAL", "Virtuals Protocol"],
  ["TRUMP", "OFFICIAL TRUMP"], ["SEI", "Sei"], ["BONK", "Bonk"], ["PENGU", "Pudgy Penguins"],
  ["CAKE", "PancakeSwap"], ["EURC", "EURC"], ["SIREN", "siren"], ["LIT", "Lighter"],
  ["ZRO", "LayerZero"], ["STX", "Stacks"], ["LUNC", "Terra Classic"], ["CHZ", "Chiliz"],
  ["AERO", "Aerodrome Finance"], ["KITE", "Kite"], ["TIA", "Celestia"], ["FDUSD", "First Digital US"],
];

function dateDaysAgo(days) {
  const date = appNow();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  for (const [symbol, name] of coins) {
    const now = appNow();
    await prisma.coin.upsert({
      where: { symbol },
      update: { name, updatedAt: now },
      create: { symbol, name, createdAt: now, updatedAt: now },
    });
  }

  const now = appNow();
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      name: "Demo Trader",
      description: "Paper trading account seeded for MVP testing.",
      startingBalance: 100000,
      currentBalance: 100000,
      createdAt: now,
    },
  });

  for (let daysAgo = 7; daysAgo >= 0; daysAgo -= 1) {
    const snapshotDate = dateDaysAgo(daysAgo);
    const totalValue = 100000 + (7 - daysAgo) * 850 + Math.sin(daysAgo) * 900;
    await prisma.userDailyAsset.upsert({
      where: {
        userId_snapshotDate: {
          userId: user.id,
          snapshotDate,
        },
      },
      update: {
        cashBalance: totalValue,
        assetValue: 0,
        totalValue,
      },
      create: {
        userId: user.id,
        snapshotDate,
        cashBalance: totalValue,
        assetValue: 0,
        totalValue,
        createdAt: appNow(),
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
