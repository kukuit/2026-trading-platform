# Crypto Paper Trading Platform

MVP paper trading crypto built with Next.js 14, TypeScript, Tailwind CSS, TanStack Query, MySQL, and Prisma.

## Setup

Create `.env.local` with a MySQL connection string:

```bash
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DATABASE"
```

Then run:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm run dev
```

## MVP Scope

- Seed 100 fixed coins.
- Manually import daily market data.
- Compute 24h and 7d change from stored market data.
- Create multiple users with virtual balances.
- Buy and sell coins at the latest imported price.
- Track holdings, trade history, daily asset snapshots, PnL, and equity curve.
