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

## Football Live Odds Collector

The collector dashboard is available at `/football`. It stores fixtures, per-match tracking, results, and live odds snapshots in MySQL through Prisma for the nine configured primary competitions: Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Liga Portugal, UCL, UEL, and UECL. Live Radar also searches live and upcoming fixtures across other API-Football competitions; selected fixtures are recorded as production data without adding those competitions to the primary catalog. All API requests stay server-side and share one UTC quota budget.

### Configure and migrate

Copy the football variables from `.env.example` into the server environment (or `.env.local` for local development). Set `APIFOOTBALL_KEY` (the older `API_FOOTBALL_KEY` name is also accepted) and a long random `FOOTBALL_ADMIN_TOKEN`; neither variable should use a `NEXT_PUBLIC_` prefix. In development, `/football` opens directly and its API routes do not require the admin token. Production asks for the token and keeps it in the current browser session. Do not expose the development server to a public network.

Generate the Prisma client and apply the migration:

```bash
npm run prisma:generate
npm run prisma:deploy
```

The additive migration seeds exactly nine league catalog rows and adds tracking, odds-slot, result, collector settings, and worker-log data. It keeps all existing fixture, odds, and request-log rows.

### Run the independent worker

Run the Next.js dashboard in one terminal:

```bash
npm run dev
```

It opens at `http://localhost:8001`. Build and run the background collector in a second terminal:

```bash
npm run football:worker:build
npm run football:worker:start
```

The worker runs independently from Next.js and records fixtures explicitly added to Live Tracking. Open `/football` to enable the nine primary leagues, choose the season and intervals, sync the schedule, then select matches to record. Live Radar searches all other API-Football competitions for in-progress fixtures or fixtures starting within 48 hours; selecting one adds it to production tracking. Defaults use up to 7,500 requests per UTC day on the Pro plan, split into 6,000 odds requests and 1,500 schedule/status requests. Provider-reported daily and per-minute limits still cap requests. The worker slows external pre-match status checks until kickoff approaches, and the MySQL lease prevents multiple worker processes from processing the same jobs.

For PM2, build the worker after deploying the app and Prisma client, then start the additional process. The existing `trading` process entry remains in the PM2 config:

```bash
npm run prisma:generate
npm run prisma:deploy
npm run football:worker:build
pm2 start ecosystem.config.js --only football-collector
pm2 save
```

Useful PM2 commands:

```bash
pm2 logs football-collector --lines 100
pm2 restart football-collector
pm2 status football-collector
```

The authenticated overview endpoint `/api/football/overview` reports `workerOnline`, job status, last success, and next run. For example, from a shell where `FOOTBALL_ADMIN_TOKEN` is set:

```bash
curl -H "Authorization: Bearer $FOOTBALL_ADMIN_TOKEN" https://your-host.example/api/football/overview
```

`/football` settings cap the daily total at the Pro plan's 7,500 requests and require odds plus reserved budgets to fit within that cap. The provider's reported daily and per-minute limits remain authoritative. System Status makes a real API check, runs `SELECT 1`, inspects the worker heartbeat, and verifies the nine primary league IDs. Fixtures display in Vietnam time; MySQL stores UTC timestamps. Unsupported or missing markets keep raw JSON and null structured fields. Missed slots are recorded without substituting current odds for past data.
