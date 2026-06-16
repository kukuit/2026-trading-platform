import { PrismaClient } from "@prisma/client";
import { appNow } from "../timezone.config.mjs";
import { seedCoins } from "./seed-coins.mjs";

const prisma = new PrismaClient();

function dateDaysAgo(days) {
  const date = appNow();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  await seedCoins(prisma);

  const now = appNow();
  const strategy = await prisma.strategy.upsert({
    where: { id: "default-strategy" },
    update: {},
    create: {
      id: "default-strategy",
      note: "Default strategy for MVP testing.",
      maxCoinCount: 10,
      coinSelectionRule: "TOP_MARKET_CAP_100",
      buyRule: "HIGHEST_24H_GROWTH",
      sellRule: "REBALANCE_DAILY",
    },
  });

  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {
      strategyId: strategy.id,
    },
    create: {
      id: "demo-user",
      name: "Demo Trader",
      description: "Paper trading account seeded for MVP testing.",
      startingBalance: 100000,
      currentBalance: 100000,
      strategyId: strategy.id,
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
