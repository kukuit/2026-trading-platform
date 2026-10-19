import { createHash } from "node:crypto";

type UnknownRecord = Record<string, unknown>;

export type NormalizedOddsValue = {
  providerBetId: number;
  betName: string;
  bookmakerId: number | null;
  bookmakerName: string | null;
  selectionName: string;
  oddValue: string;
  oddNumeric: string | null;
  main: boolean | null;
  suspended: boolean | null;
  blocked: boolean | null;
  stopped: boolean | null;
  finished: boolean | null;
  extraData: UnknownRecord;
};

export type NormalizedLiveOdds = {
  fixtureId: number | null;
  providerUpdatedAt: Date | null;
  values: NormalizedOddsValue[];
  status: {
    blocked: boolean | null;
    stopped: boolean | null;
    finished: boolean | null;
  };
  canonical: UnknownRecord;
  sourceHash: string;
};

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberOrNull(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isInteger(number) && Number.isFinite(number) ? number : null;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectId(value: unknown, key: string) {
  return numberOrNull(record(value)?.[key]);
}

function parseProviderDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function oddsEntries(raw: unknown): UnknownRecord[] {
  const outer = record(raw);
  const response = outer && Array.isArray(outer.response) ? outer.response : [raw];
  return response.map(record).filter((item): item is UnknownRecord => Boolean(item));
}

function toRawRows(entry: UnknownRecord): NormalizedOddsValue[] {
  const rows: NormalizedOddsValue[] = [];
  const entryStatus = {
    blocked: boolOrNull(entry.blocked),
    stopped: boolOrNull(entry.stopped),
    finished: boolOrNull(entry.finished),
  };

  const pushBet = (
    bet: UnknownRecord,
    bookmaker: UnknownRecord | null,
    inherited: typeof entryStatus,
  ) => {
    const betId = numberOrNull(bet.id) ?? numberOrNull(bet.betId) ?? 0;
    const betName = stringOrNull(bet.name) ?? stringOrNull(bet.betName) ?? `Bet ${betId}`;

    for (const unknownValue of list(bet.values)) {
      const value = record(unknownValue);
      if (!value) continue;
      const odd = value.odd ?? value.odds;
      const oddValue = typeof odd === "number" ? String(odd) : stringOrNull(odd);
      const selectionName =
        stringOrNull(value.value) ??
        stringOrNull(value.name) ??
        stringOrNull(value.selection) ??
        stringOrNull(value.label);
      if (!oddValue || !selectionName) continue;

      const numeric = Number(oddValue);
      const { odd: _odd, odds: _odds, ...extraData } = value;
      rows.push({
        providerBetId: betId,
        betName,
        bookmakerId: objectId(bookmaker, "id"),
        bookmakerName: stringOrNull(bookmaker?.name),
        selectionName,
        oddValue,
        oddNumeric: Number.isFinite(numeric) ? String(numeric) : null,
        main: boolOrNull(value.main),
        suspended: boolOrNull(value.suspended),
        blocked: boolOrNull(value.blocked) ?? inherited.blocked,
        stopped: boolOrNull(value.stopped) ?? inherited.stopped,
        finished: boolOrNull(value.finished) ?? inherited.finished,
        extraData,
      });
    }
  };

  for (const unknownBookmaker of list(entry.bookmakers)) {
    const bookmaker = record(unknownBookmaker);
    if (!bookmaker) continue;
    const bookmakerStatus = {
      blocked: boolOrNull(bookmaker.blocked) ?? entryStatus.blocked,
      stopped: boolOrNull(bookmaker.stopped) ?? entryStatus.stopped,
      finished: boolOrNull(bookmaker.finished) ?? entryStatus.finished,
    };
    for (const unknownBet of list(bookmaker.bets)) {
      const bet = record(unknownBet);
      if (bet) pushBet(bet, bookmaker, bookmakerStatus);
    }
  }

  // Live odds responses may expose markets directly as `odds` instead of
  // grouping them under bookmakers. Keep bookmaker IDs null when absent.
  for (const unknownBet of [...list(entry.odds), ...list(entry.bets)]) {
    const bet = record(unknownBet);
    if (bet) pushBet(bet, null, entryStatus);
  }

  return rows.sort((a, b) =>
    [a.providerBetId, a.bookmakerId ?? -1, a.betName, a.selectionName, a.oddValue].join("|")
      .localeCompare(
        [b.providerBetId, b.bookmakerId ?? -1, b.betName, b.selectionName, b.oddValue].join("|"),
      ),
  );
}

export function normalizeLiveOdds(raw: unknown, fallbackFixtureId?: number): NormalizedLiveOdds {
  const entries = oddsEntries(raw);
  const fixtureId =
    entries.map((entry) => objectId(entry.fixture, "id")).find((id) => id !== null) ??
    fallbackFixtureId ??
    null;
  const values = entries.flatMap(toRawRows);
  const status = {
    blocked: entries.map((entry) => boolOrNull(entry.blocked)).find((value) => value !== null) ?? null,
    stopped: entries.map((entry) => boolOrNull(entry.stopped)).find((value) => value !== null) ?? null,
    finished: entries.map((entry) => boolOrNull(entry.finished)).find((value) => value !== null) ?? null,
  };
  const providerUpdatedAt =
    entries.map((entry) => parseProviderDate(entry.update ?? entry.updatedAt)).find(Boolean) ?? null;

  const canonical = {
    fixtureId,
    status,
    values: values.map(({ extraData, ...value }) => ({
      ...value,
      // Keep line/handicap and other odds metadata, while sorting keys below.
      extraData: extraData,
    })),
  };
  const sourceHash = createHash("sha256").update(stableStringify(canonical)).digest("hex");
  return { fixtureId, providerUpdatedAt, values, status, canonical, sourceHash };
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const object = record(value);
  if (object) {
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function rawResponseFixture(raw: unknown) {
  const entry = oddsEntries(raw)[0];
  if (!entry) return null;
  const fixture = record(entry.fixture);
  const teams = record(entry.teams);
  const home = record(teams?.home);
  const away = record(teams?.away);
  const league = record(entry.league);
  const status = record(fixture?.status);
  const goals = record(entry.goals);
  const score = record(entry.score);
  const halftime = record(score?.halftime);
  const fulltime = record(score?.fulltime);
  const kickoffAt = parseProviderDate(fixture?.date ?? entry.date);
  const fixtureId = objectId(fixture, "id");
  if (!fixtureId) return null;

  return {
    providerFixtureId: fixtureId,
    providerLeagueId: objectId(league, "id") ?? 0,
    season: numberOrNull(league?.season) ?? new Date().getUTCFullYear(),
    homeTeamId: objectId(home, "id"),
    awayTeamId: objectId(away, "id"),
    homeTeamName: stringOrNull(home?.name) ?? `Home team (${fixtureId})`,
    awayTeamName: stringOrNull(away?.name) ?? `Away team (${fixtureId})`,
    homeTeamLogo: stringOrNull(home?.logo),
    awayTeamLogo: stringOrNull(away?.logo),
    kickoffAt: kickoffAt ?? new Date(),
    status: stringOrNull(status?.short) ?? "LIVE",
    elapsedMinute: numberOrNull(status?.elapsed),
    homeScore: numberOrNull(goals?.home),
    awayScore: numberOrNull(goals?.away),
    homeScoreHt: numberOrNull(halftime?.home),
    awayScoreHt: numberOrNull(halftime?.away),
    homeScoreFt: numberOrNull(fulltime?.home) ?? numberOrNull(goals?.home),
    awayScoreFt: numberOrNull(fulltime?.away) ?? numberOrNull(goals?.away),
    elapsedExtraTime: numberOrNull(status?.extra) ?? 0,
  };
}

export function providerFixture(raw: unknown) {
  const item = record(raw);
  const fixture = record(item?.fixture);
  const league = record(item?.league);
  const teams = record(item?.teams);
  const home = record(teams?.home);
  const away = record(teams?.away);
  const status = record(fixture?.status);
  const goals = record(item?.goals);
  const score = record(item?.score);
  const halftime = record(score?.halftime);
  const fulltime = record(score?.fulltime);
  const kickoffAt = parseProviderDate(fixture?.date);
  const providerFixtureId = objectId(fixture, "id");
  if (!providerFixtureId || !kickoffAt) return null;

  return {
    providerFixtureId,
    providerLeagueId: objectId(league, "id") ?? 0,
    season: numberOrNull(league?.season) ?? new Date().getUTCFullYear(),
    homeTeamId: objectId(home, "id"),
    awayTeamId: objectId(away, "id"),
    homeTeamName: stringOrNull(home?.name) ?? "Home team",
    awayTeamName: stringOrNull(away?.name) ?? "Away team",
    homeTeamLogo: stringOrNull(home?.logo),
    awayTeamLogo: stringOrNull(away?.logo),
    kickoffAt,
    status: stringOrNull(status?.short) ?? "NS",
    elapsedMinute: numberOrNull(status?.elapsed),
    homeScore: numberOrNull(goals?.home),
    awayScore: numberOrNull(goals?.away),
    homeScoreHt: numberOrNull(halftime?.home),
    awayScoreHt: numberOrNull(halftime?.away),
    homeScoreFt: numberOrNull(fulltime?.home) ?? numberOrNull(goals?.home),
    awayScoreFt: numberOrNull(fulltime?.away) ?? numberOrNull(goals?.away),
    elapsedExtraTime: numberOrNull(status?.extra) ?? 0,
  };
}

