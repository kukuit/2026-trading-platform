import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

function loadEnvironment() {
  const externallySet = new Set(Object.keys(process.env));
  for (const filename of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), filename);
    if (!existsSync(path)) continue;
    for (const entry of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = entry.trim();
      if (!line || line.startsWith("#")) continue;
      const separator = line.indexOf("=");
      if (separator < 1) continue;
      const key = line.slice(0, separator).trim();
      if (externallySet.has(key)) continue;
      process.env[key] = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    }
  }
}

function booleanOrNull(value) {
  if (value === null || value === undefined) return null;
  return value === true || Number(value) === 1;
}

function parseExtraData(value) {
  if (typeof value !== "string") return value ?? {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

loadEnvironment();
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const typescript = require("typescript");
const prisma = new PrismaClient();

const cornerFields = [
  "cornerAhHtLine", "cornerAhHtHomePrice", "cornerAhHtAwayPrice",
  "cornerOuHtLine", "cornerOuHtOverPrice", "cornerOuHtUnderPrice",
  "cornerAhFtLine", "cornerAhFtHomePrice", "cornerAhFtAwayPrice",
  "cornerOuFtLine", "cornerOuFtOverPrice", "cornerOuFtUnderPrice",
];

async function main() {
  const [table] = await prisma.$queryRawUnsafe(
    "SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'FootballOddsValue' LIMIT 1",
  );
  if (!table) {
    console.log("Legacy football odds table is absent; corner backfill skipped.");
    return;
  }

  const snapshots = await prisma.$queryRawUnsafe(`
    SELECT s.id, s.bookmakerId, f.homeTeamName, f.awayTeamName
    FROM FootballOddsSnapshot s
    JOIN FootballFixture f ON f.id = s.fixtureId
    WHERE s.sourceType = 'PREMATCH'
      AND EXISTS (SELECT 1 FROM FootballOddsValue v WHERE v.snapshotId = s.id)
  `);
  if (snapshots.length === 0) {
    console.log("No legacy pre-match odds found; corner backfill skipped.");
    return;
  }

  const ids = snapshots.map((snapshot) => snapshot.id);
  const placeholders = ids.map(() => "?").join(", ");
  const rows = await prisma.$queryRawUnsafe(`
    SELECT snapshotId, providerBetId, betName, bookmakerId, bookmakerName,
      selectionName, oddValue, oddNumeric, main, suspended, blocked, stopped,
      finished, extraData
    FROM FootballOddsValue
    WHERE snapshotId IN (${placeholders})
  `, ...ids);
  const valuesBySnapshot = new Map(ids.map((id) => [id, []]));
  for (const row of rows) {
    valuesBySnapshot.get(row.snapshotId)?.push({
      ...row,
      oddNumeric: row.oddNumeric === null ? null : String(row.oddNumeric),
      main: booleanOrNull(row.main),
      suspended: booleanOrNull(row.suspended),
      blocked: booleanOrNull(row.blocked),
      stopped: booleanOrNull(row.stopped),
      finished: booleanOrNull(row.finished),
      extraData: parseExtraData(row.extraData),
    });
  }

  const marketsSource = readFileSync(resolve(process.cwd(), "src/lib/football/markets.ts"), "utf8");
  const compiled = typescript.transpileModule(marketsSource, {
    compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022 },
  }).outputText;
  const marketModule = {};
  new Function("exports", compiled)(marketModule);
  const { parseStructuredLiveMarkets } = marketModule;

  let backfilledSnapshots = 0;
  let completeSnapshots = 0;
  for (const snapshot of snapshots) {
    const values = valuesBySnapshot.get(snapshot.id) ?? [];
    values.sort((a, b) =>
      [a.providerBetId, a.bookmakerId ?? -1, a.betName, a.selectionName, a.oddValue].join("|")
        .localeCompare([b.providerBetId, b.bookmakerId ?? -1, b.betName, b.selectionName, b.oddValue].join("|")),
    );
    const markets = parseStructuredLiveMarkets(
      values,
      { home: snapshot.homeTeamName, away: snapshot.awayTeamName },
      snapshot.bookmakerId,
    );
    const fields = Object.fromEntries(cornerFields.map((field) => [field, markets[field]]));
    if (cornerFields.every((field) => fields[field] !== null)) completeSnapshots += 1;
    if (cornerFields.every((field) => fields[field] === null)) continue;

    const assignments = cornerFields.map((field) => `\`${field}\` = COALESCE(\`${field}\`, ?)`).join(", ");
    await prisma.$executeRawUnsafe(
      `UPDATE FootballOddsSnapshot SET ${assignments} WHERE id = ? AND sourceType = 'PREMATCH'`,
      ...cornerFields.map((field) => fields[field]),
      snapshot.id,
    );
    backfilledSnapshots += 1;
  }

  console.log(JSON.stringify({
    legacyPreMatchSnapshots: snapshots.length,
    backfilledSnapshots,
    snapshotsWithAllCornerMarkets: completeSnapshots,
  }));
}

main()
  .catch(() => {
    console.error("Legacy corner odds backfill failed; raw odds cleanup was stopped.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
