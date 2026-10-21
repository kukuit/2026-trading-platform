import { apiFootballClient } from "./api-client";

export type FixtureStatistics = {
  homeCornerKicks: number | null;
  awayCornerKicks: number | null;
};

export type FixtureCornerResults = {
  homeCornerKicksHt: number | null;
  awayCornerKicksHt: number | null;
  homeCornerKicksFt: number | null;
  awayCornerKicksFt: number | null;
};

const EMPTY_FIXTURE_STATISTICS: FixtureStatistics = {
  homeCornerKicks: null,
  awayCornerKicks: null,
};

type RecordValue = Record<string, unknown>;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : null;
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function statisticCount(team: RecordValue | null | undefined, label: string) {
  const rows = Array.isArray(team?.statistics) ? team.statistics : [];
  const row = rows.map(record).find((item) => normalized(String(item?.type ?? "")) === normalized(label));
  const value = row?.value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  return null;
}

export function parseFixtureStatistics(
  payload: unknown,
  teams: { homeId: number | null; awayId: number | null; homeName: string; awayName: string },
): FixtureStatistics {
  const response = record(payload)?.response;
  const rows = Array.isArray(response) ? response.map(record).filter((item): item is RecordValue => Boolean(item)) : [];
  const teamFor = (teamId: number | null, name: string, fallbackIndex: number) =>
    rows.find((item) => {
      const team = record(item.team);
      const id = typeof team?.id === "number" ? team.id : null;
      return teamId !== null && id === teamId;
    }) ?? rows.find((item) => normalized(String(record(item.team)?.name ?? "")) === normalized(name)) ?? rows[fallbackIndex] ?? null;
  const home = teamFor(teams.homeId, teams.homeName, 0);
  const away = teamFor(teams.awayId, teams.awayName, 1);

  return {
    homeCornerKicks: statisticCount(home, "Corner Kicks"),
    awayCornerKicks: statisticCount(away, "Corner Kicks"),
  };
}

export async function fetchFixtureStatistics(
  fixtureId: number,
  teams: { homeId: number | null; awayId: number | null; homeName: string; awayName: string },
  half?: boolean,
) {
  const payload = await apiFootballClient.get(
    "/fixtures/statistics",
    { fixture: fixtureId, ...(half === undefined ? {} : { half: String(half) }) },
    { type: "RESERVED", fixtureId },
  );
  return parseFixtureStatistics(payload, teams);
}

export async function fetchFixtureCornerResults(
  fixtureId: number,
  teams: { homeId: number | null; awayId: number | null; homeName: string; awayName: string },
): Promise<FixtureCornerResults> {
  const [fullTimeResult, firstHalfResult] = await Promise.allSettled([
    fetchFixtureStatistics(fixtureId, teams),
    fetchFixtureStatistics(fixtureId, teams, true),
  ]);
  if (fullTimeResult.status === "rejected" && firstHalfResult.status === "rejected") {
    throw fullTimeResult.reason;
  }
  const fullTime = fullTimeResult.status === "fulfilled" ? fullTimeResult.value : emptyFixtureStatistics();
  const firstHalf = firstHalfResult.status === "fulfilled" ? firstHalfResult.value : emptyFixtureStatistics();
  return {
    homeCornerKicksHt: firstHalf.homeCornerKicks,
    awayCornerKicksHt: firstHalf.awayCornerKicks,
    homeCornerKicksFt: fullTime.homeCornerKicks,
    awayCornerKicksFt: fullTime.awayCornerKicks,
  };
}

export function emptyFixtureStatistics(): FixtureStatistics {
  return { ...EMPTY_FIXTURE_STATISTICS };
}
