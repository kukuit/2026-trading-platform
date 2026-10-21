function integerEnv(name: string, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

function booleanEnv(name: string, fallback: boolean) {
  const value = process.env[name]?.toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export const FOOTBALL_DEFAULTS = {
  leagueId: integerEnv("FOOTBALL_LEAGUE_ID", 39, 1, 9999),
  season: integerEnv("FOOTBALL_SEASON", 2026, 1900, 2100),
  dailyTotalLimit: integerEnv("FOOTBALL_DAILY_TOTAL_LIMIT", 7500, 1, 7500),
  dailyOddsBudget: integerEnv("FOOTBALL_DAILY_ODDS_BUDGET", 6000, 0, 7500),
  dailyReservedBudget: integerEnv("FOOTBALL_DAILY_RESERVED_BUDGET", 1500, 0, 7500),
  livePollingIntervalSeconds: integerEnv("FOOTBALL_LIVE_POLL_SECONDS", 300, 60, 3600),
  collectorEnabled: booleanEnv("FOOTBALL_COLLECTOR_ENABLED", true),
  oddsIntervalMinutes: integerEnv("FOOTBALL_ODDS_INTERVAL_MINUTES", 5, 1, 15),
  fixtureSyncIntervalHours: integerEnv("FOOTBALL_FIXTURE_SYNC_HOURS", 6, 1, 24),
  statusCheckIntervalSeconds: integerEnv("FOOTBALL_STATUS_CHECK_SECONDS", 60, 60, 3600),
  requestTimeoutMs: integerEnv("FOOTBALL_REQUEST_TIMEOUT_MS", 10_000, 1000, 30_000),
  quotaResetTimezone: "UTC",
} as const;

export function getUtcDate(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function footballDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "1970";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftFootballDate(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

