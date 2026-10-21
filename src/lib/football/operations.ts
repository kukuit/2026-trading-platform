import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { FOOTBALL_DEFAULTS, footballDateKey, shiftFootballDate, utcDateKey } from "./config";
import { FOOTBALL_LEAGUES, footballJobName, getFootballLeague, isSupportedFootballLeague } from "./leagues";
import { apiFootballClient } from "./api-client";
import { isLiveFixtureStatus, isTerminalFixtureStatus, getCollectorJobs } from "./service";
import { providerFixture } from "./normalizer";
import { displayHandicapLines, PREMATCH_SLOT_KEY, snapshotSlotDefinitions } from "./markets";
import { isProviderRateLimited, resultStatusFromScores, shouldPauseForQuota } from "./collection-rules";
import { fetchFixtureCornerResults, type FixtureCornerResults } from "./statistics";
import { settleFixtureOdds } from "./settlement";

const NOT_STARTED = ["NS", "TBD"];
const VISIBLE_ODDS_HISTORY: Prisma.FootballOddsSnapshotWhereInput = {
  OR: [
    { sourceType: "LIVE" },
    { sourceType: "PREMATCH", slotKey: PREMATCH_SLOT_KEY },
  ],
};

function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function responseRows(payload: unknown) {
  const response = obj(payload)?.response;
  return Array.isArray(response) ? response : [];
}

async function fetchAllFixturePages(params: Record<string, string | number>) {
  const firstPage = await apiFootballClient.get("/fixtures", params, { type: "RESERVED" });
  const paging = obj(obj(firstPage)?.paging);
  const pageCount = Math.max(1, Math.min(100, toInt(paging?.total) ?? 1));
  const rows = responseRows(firstPage);

  for (let page = 2; page <= pageCount; page += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
    const nextPage = await apiFootballClient.get("/fixtures", { ...params, page }, { type: "RESERVED" });
    rows.push(...responseRows(nextPage));
  }

  return rows;
}

function toInt(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function vietnamDateBoundary(date: string, endOfDay = false) {
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!valid) return new Date(Number.NaN);
  return new Date(`${date}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`);
}

function cleanFixtureData(fixture: NonNullable<ReturnType<typeof providerFixture>>, leagueCatalogId: string | null) {
  const finished = isTerminalFixtureStatus(fixture.status);
  return {
    ...fixture,
    leagueCatalogId,
    homeScoreHt: fixture.homeScoreHt,
    awayScoreHt: fixture.awayScoreHt,
    homeScoreFt: finished ? fixture.homeScoreFt : null,
    awayScoreFt: finished ? fixture.awayScoreFt : null,
    ...(finished && fixture.homeScoreHt !== null && fixture.awayScoreHt !== null && fixture.homeScoreFt !== null && fixture.awayScoreFt !== null
      ? { resultStatus: "RESULT_COMPLETE" as const, resultSource: "API", resultUpdatedAt: new Date() }
      : {}),
  };
}

async function saveProviderFixture(raw: unknown, options: { isTest?: boolean; leagueCatalogId?: string | null } = {}) {
  const fixture = providerFixture(raw);
  if (!fixture) throw new Error("Provider response did not contain a valid fixture.");
  const existing = await prisma.footballFixture.findUnique({ where: { providerFixtureId: fixture.providerFixtureId }, select: { resultStatus: true } });
  const knownLeague = getFootballLeague(fixture.providerLeagueId);
  const catalog = options.leagueCatalogId !== undefined
    ? options.leagueCatalogId
    : knownLeague
      ? (await prisma.footballLeague.findUnique({ where: { apiLeagueId: fixture.providerLeagueId }, select: { id: true } }))?.id ?? null
      : null;
  const data = cleanFixtureData(fixture, catalog);
  const preservedResultFields = new Set(["homeScoreHt", "awayScoreHt", "homeScoreFt", "awayScoreFt", "resultStatus", "resultSource", "resultUpdatedAt"]);
  const updateData = existing?.resultStatus === "RESULT_MANUAL"
    ? Object.fromEntries(Object.entries(data).filter(([key]) => !preservedResultFields.has(key))) as typeof data
    : data;
  const savedFixture = await prisma.footballFixture.upsert({
    where: { providerFixtureId: fixture.providerFixtureId },
    create: { ...data, isTestFixture: Boolean(options.isTest) },
    update: updateData,
  });
  await settleFixtureOdds(savedFixture.id);
  return savedFixture;
}

export async function listFootballLeagues() {
  const jobs = await getCollectorJobs();
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * 86_400_000);
  const [leagues, nextFixtures, recordings] = await Promise.all([
    prisma.footballLeague.findMany({ orderBy: { apiLeagueId: "asc" } }),
    prisma.footballFixture.groupBy({
      by: ["providerLeagueId"],
      where: { isTestFixture: false, kickoffAt: { gte: now, lte: horizon }, status: { in: NOT_STARTED } },
      _count: { _all: true },
    }),
    prisma.footballLiveTracking.groupBy({
      by: ["fixtureId"],
      where: { isEnabled: true, status: "RECORDING" },
    }),
  ]);
  const recordingFixtures = recordings.length
    ? await prisma.footballFixture.findMany({ where: { id: { in: recordings.map((record) => record.fixtureId) } }, select: { providerLeagueId: true } })
    : [];
  const liveCounts = new Map<number, number>();
  for (const fixture of recordingFixtures) liveCounts.set(fixture.providerLeagueId, (liveCounts.get(fixture.providerLeagueId) ?? 0) + 1);
  const upcomingCounts = new Map(nextFixtures.map((record) => [record.providerLeagueId, record._count._all]));

  return FOOTBALL_LEAGUES.map((catalog) => {
    const row = leagues.find((league) => league.apiLeagueId === catalog.id);
    const job = jobs.find((collector) => collector.leagueId === catalog.id);
    const liveCount = liveCounts.get(catalog.id) ?? 0;
    return {
      ...catalog,
      id: row?.id ?? null,
      isEnabled: row?.isEnabled ?? job?.enabled ?? false,
      season: row?.season ?? job?.season ?? FOOTBALL_DEFAULTS.season,
      verifiedAt: row?.verifiedAt?.toISOString() ?? null,
      upcomingCount: upcomingCounts.get(catalog.id) ?? 0,
      recordingCount: liveCount,
      status: liveCount > 0 ? "LIVE" : job?.status === "ERROR" ? "ERROR" : "WAITING",
    };
  });
}

export async function setFootballLeagueEnabled(apiLeagueId: number, isEnabled: boolean) {
  if (!isSupportedFootballLeague(apiLeagueId)) throw new Error("Unsupported football league ID.");
  const catalog = getFootballLeague(apiLeagueId)!;
  await getCollectorJobs();
  await prisma.$transaction([
    prisma.footballLeague.update({ where: { apiLeagueId }, data: { isEnabled } }),
    prisma.footballCollectorJob.update({
      where: { jobName: footballJobName(apiLeagueId) },
      data: {
        enabled: isEnabled,
        ...(isEnabled ? { status: "WAITING", nextRunAt: null } : { status: "DISABLED", nextRunAt: null }),
      },
    }),
  ]);
  const updated = await prisma.footballLeague.findUnique({ where: { apiLeagueId } });
  return { ...catalog, isEnabled: updated?.isEnabled ?? isEnabled };
}

export async function verifyFootballLeagueIds() {
  const verified = [];
  for (const league of FOOTBALL_LEAGUES) {
    const payload = await apiFootballClient.get("/leagues", { id: league.id }, { type: "RESERVED" });
    const response = responseRows(payload);
    const match = response.map(obj).find((item) => toInt(obj(item?.league)?.id) === league.id);
    if (!match) {
      verified.push({ key: league.key, apiLeagueId: league.id, verified: false, providerName: null, providerCountry: null });
      continue;
    }
    const providerLeague = obj(match.league);
    await prisma.footballLeague.updateMany({ where: { apiLeagueId: league.id }, data: { verifiedAt: new Date() } });
    verified.push({
      key: league.key,
      apiLeagueId: league.id,
      verified: true,
      providerName: typeof providerLeague?.name === "string" ? providerLeague.name : null,
      providerCountry: typeof providerLeague?.country === "string" ? providerLeague.country : null,
    });
  }
  return { verified, allVerified: verified.every((league) => league.verified) };
}

export type FixtureQuery = {
  filter?: string;
  from?: string;
  to?: string;
  leagueId?: number;
  status?: string;
  search?: string;
  page?: number;
  test?: boolean;
  recordedOnly?: boolean;
};

export async function queryFixtures(query: FixtureQuery) {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const take = 50;
  const now = new Date();
  const start = query.from ? vietnamDateBoundary(query.from) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const end = query.to ? vietnamDateBoundary(query.to, true) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new Error("Invalid fixture date range.");

  const filterStatus: { in: string[] } | undefined = query.filter === "LIVE"
    ? { in: ["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE", "SUSP"] }
    : query.filter === "UPCOMING"
      ? { in: NOT_STARTED }
      : query.filter === "FINISHED"
        ? { in: ["FT", "AET", "PEN", "CANC", "PST", "ABD", "AWD", "WO"] }
        : undefined;
  const isTest = query.filter === "TEST" ? true : query.test ?? false;
  const where: Prisma.FootballFixtureWhereInput = {
    kickoffAt: { gte: start, lte: end },
    ...(query.recordedOnly ? { oddsSnapshots: { some: VISIBLE_ODDS_HISTORY } } : { isTestFixture: isTest }),
    ...(query.leagueId ? { providerLeagueId: query.leagueId } : {}),
    ...(query.status ? { status: query.status.toUpperCase() } : filterStatus ? { status: filterStatus } : {}),
    ...(query.search ? { OR: [
      { homeTeamName: { contains: query.search } },
      { awayTeamName: { contains: query.search } },
    ] } : {}),
  };
  const [fixtures, total] = await Promise.all([
    prisma.footballFixture.findMany({
      where,
      orderBy: query.recordedOnly
        ? [{ kickoffAt: "desc" }, { providerFixtureId: "desc" }]
        : [{ kickoffAt: "asc" }, { providerFixtureId: "asc" }],
      skip: (page - 1) * take,
      take,
      include: {
        liveTracking: { select: { id: true, status: true, isEnabled: true } },
        _count: { select: { oddsSnapshots: { where: query.recordedOnly ? VISIBLE_ODDS_HISTORY : { isTest } } } },
        oddsSnapshots: {
          where: {
            ...VISIBLE_ODDS_HISTORY,
            ...(query.recordedOnly ? {} : {
              isTest,
              AND: [{
                OR: [
                  { ahFtLine: { not: null } },
                  { ahFtHomePrice: { not: null } },
                  { ahFtAwayPrice: { not: null } },
                ],
              }],
            }),
          },
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: {
            capturedAt: true,
            sourceType: true,
            period: true,
            fixtureStatus: true,
            homeScore: true,
            awayScore: true,
            ahFtLine: true,
            ahFtHomePrice: true,
            ahFtAwayPrice: true,
            homeCornerKicks: true,
            awayCornerKicks: true,
          },
        },
      },
    }),
    prisma.footballFixture.count({ where }),
  ]);
  return {
    fixtures: fixtures.map((fixture) => {
      const { _count, ...fixtureWithSnapshots } = fixture;
      const { oddsSnapshots, ...fixtureData } = fixtureWithSnapshots;
      const latestAhFt = oddsSnapshots[0];
      const displayedLines = latestAhFt ? displayHandicapLines(latestAhFt) : null;
      return {
        ...fixtureData,
        kickoffAt: fixture.kickoffAt.toISOString(),
        lastSyncedAt: fixture.lastSyncedAt?.toISOString() ?? null,
        resultUpdatedAt: fixture.resultUpdatedAt?.toISOString() ?? null,
        liveTracking: fixture.liveTracking,
        snapshotCount: _count.oddsSnapshots,
        lastOddsAt: oddsSnapshots[0]?.capturedAt.toISOString() ?? null,
        latestAhFtLine: displayedLines?.ahFtLine ?? null,
        latestAhFtHomePrice: latestAhFt?.ahFtHomePrice?.toString() ?? null,
        latestAhFtAwayPrice: latestAhFt?.ahFtAwayPrice?.toString() ?? null,
        latestHomeCornerKicks: latestAhFt?.homeCornerKicks ?? null,
        latestAwayCornerKicks: latestAhFt?.awayCornerKicks ?? null,
      };
    }),
    page, pageSize: take, total,
  };
}

export async function syncFixtureRange(input: { from?: string; to?: string; leagueIds?: number[] }) {
  const today = footballDateKey();
  const from = input.from ?? today;
  const to = input.to ?? shiftFootballDate(today, 7);
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T23:59:59Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
    throw new Error("Invalid fixture date range.");
  }
  if (toDate.getTime() - fromDate.getTime() > 370 * 86_400_000) {
    throw new Error("Fixture sync date range cannot exceed 370 days.");
  }
  const enabledJobs = (await getCollectorJobs()).filter((job) => job.enabled);
  const selected = input.leagueIds?.length
    ? enabledJobs.filter((job) => input.leagueIds!.includes(job.leagueId))
    : enabledJobs;
  if (input.leagueIds?.some((id) => !isSupportedFootballLeague(id))) throw new Error("One or more league IDs are not supported.");
  if (!selected.length) throw new Error("Enable at least one supported competition before syncing fixtures.");

  const results = [];
  for (const job of selected) {
    const payload = await apiFootballClient.get("/fixtures", {
      league: job.leagueId, season: job.season, from, to, timezone: "Asia/Ho_Chi_Minh",
    }, { type: "RESERVED" });
    const rows = responseRows(payload);
    let synced = 0;
    for (const raw of rows) {
      const fixture = providerFixture(raw);
      if (!fixture || fixture.providerLeagueId !== job.leagueId) continue;
      await saveProviderFixture(raw, { isTest: false });
      synced += 1;
    }
    await prisma.footballCollectorJob.update({ where: { id: job.id }, data: { lastFixtureSyncAt: new Date(), lastError: null } });
    await prisma.footballLeague.updateMany({ where: { apiLeagueId: job.leagueId }, data: { season: job.season } });
    results.push({ leagueId: job.leagueId, league: job.name, synced });
  }
  return { from, to, leagues: results, synced: results.reduce((sum, result) => sum + result.synced, 0) };
}

export async function findTestFixtures(input: {
  from?: string; to?: string; search?: string; status?: string; live?: boolean;
}) {
  const today = footballDateKey();
  const from = input.from ?? today;
  const to = input.to ?? shiftFootballDate(today, 2);
  let payload: unknown;
  if (input.live) {
    payload = await apiFootballClient.get("/fixtures", { live: "all" }, { type: "RESERVED" });
  } else if (input.search?.trim()) {
    const teamsPayload = await apiFootballClient.get("/teams", { search: input.search.trim() }, { type: "RESERVED" });
    const teamIds = responseRows(teamsPayload).map((row) => toInt(obj(row)?.team && obj(obj(row)?.team)?.id)).filter((id): id is number => id !== null).slice(0, 5);
    if (!teamIds.length) return { fixtures: [], from, to, total: 0 };
    const rows = [];
    for (const team of teamIds) {
      const result = await apiFootballClient.get("/fixtures", { team, from, to, timezone: "Asia/Ho_Chi_Minh" }, { type: "RESERVED" });
      rows.push(...responseRows(result));
    }
    payload = { response: rows };
  } else {
    payload = await apiFootballClient.get("/fixtures", { from, to, timezone: "Asia/Ho_Chi_Minh" }, { type: "RESERVED" });
  }

  const fixtures = responseRows(payload)
    .map(providerFixture)
    .filter((fixture): fixture is NonNullable<typeof fixture> => Boolean(fixture))
    .filter((fixture) => !input.status || fixture.status.toUpperCase() === input.status.toUpperCase())
    .filter((fixture) => !input.search || `${fixture.homeTeamName} ${fixture.awayTeamName}`.toLocaleLowerCase().includes(input.search.toLocaleLowerCase()))
    .sort((left, right) => {
      const now = Date.now();
      const priority = (fixture: NonNullable<typeof left>) => {
        const externalLeague = isSupportedFootballLeague(fixture.providerLeagueId) ? 1 : 0;
        const kickoff = fixture.kickoffAt.getTime();
        const kickoffSoon = ["NS", "TBD"].includes(fixture.status) && kickoff >= now && kickoff <= now + 6 * 60 * 60 * 1000;
        const matchPriority = kickoffSoon ? 0 : isLiveFixtureStatus(fixture.status) ? 1 : 2;
        return externalLeague * 10 + matchPriority;
      };
      return priority(left) - priority(right) || left.kickoffAt.getTime() - right.kickoffAt.getTime();
    });
  return {
    fixtures: fixtures.slice(0, 100).map((fixture) => ({ ...fixture, kickoffAt: fixture.kickoffAt.toISOString() })),
    from, to, total: fixtures.length,
  };
}

export async function discoverExternalFixtures(mode: "LIVE" | "UPCOMING") {
  const now = new Date();
  const horizon = now.getTime() + 48 * 60 * 60 * 1000;
  const from = utcDateKey(now);
  const to = utcDateKey(new Date(horizon));
  let providerRows: unknown[];

  if (mode === "LIVE") {
    providerRows = await fetchAllFixturePages({ live: "all" });
  } else {
    providerRows = [];
    const firstDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const lastDate = new Date(Date.UTC(new Date(horizon).getUTCFullYear(), new Date(horizon).getUTCMonth(), new Date(horizon).getUTCDate()));
    let date = firstDate;
    let requestedDates = 0;

    while (date.getTime() <= lastDate.getTime()) {
      if (requestedDates > 0) await new Promise<void>((resolve) => setTimeout(resolve, 250));
      providerRows.push(...await fetchAllFixturePages({ date: utcDateKey(date) }));
      requestedDates += 1;
      date = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    }
  }
  const discovered = providerRows
    .map((raw) => {
      const fixture = providerFixture(raw);
      if (!fixture) return null;
      const league = obj(obj(raw)?.league);
      return {
        ...fixture,
        leagueName: typeof league?.name === "string" ? league.name : "League " + fixture.providerLeagueId,
        leagueCountry: typeof league?.country === "string" ? league.country : null,
      };
    })
    .filter((fixture): fixture is NonNullable<typeof fixture> => Boolean(fixture))
    .filter((fixture) => fixture.providerLeagueId > 0 && !isSupportedFootballLeague(fixture.providerLeagueId))
    .filter((fixture) => mode === "LIVE"
      ? isLiveFixtureStatus(fixture.status)
      : NOT_STARTED.includes(fixture.status) && fixture.kickoffAt >= now && fixture.kickoffAt.getTime() <= horizon)
    .sort((left, right) => mode === "LIVE"
      ? right.kickoffAt.getTime() - left.kickoffAt.getTime()
      : left.kickoffAt.getTime() - right.kickoffAt.getTime());

  const stored = discovered.length
    ? await prisma.footballFixture.findMany({
      where: { providerFixtureId: { in: discovered.map((fixture) => fixture.providerFixtureId) } },
      select: {
        id: true,
        providerFixtureId: true,
        isTestFixture: true,
        liveTracking: { select: { id: true, status: true, isEnabled: true } },
        _count: { select: { oddsSnapshots: true } },
      },
    })
    : [];
  const storedByProviderId = new Map(stored.map((fixture) => [fixture.providerFixtureId, fixture]));

  return {
    mode,
    from,
    to,
    fetchedAt: new Date().toISOString(),
    total: discovered.length,
    fixtures: discovered.map((fixture) => {
      const existing = storedByProviderId.get(fixture.providerFixtureId);
      return {
        ...fixture,
        id: existing?.id ?? null,
        kickoffAt: fixture.kickoffAt.toISOString(),
        isTestFixture: existing?.isTestFixture ?? false,
        liveTracking: existing?.liveTracking ?? null,
        snapshotCount: existing?._count.oddsSnapshots ?? 0,
      };
    }),
  };
}

export async function startFixtureTracking(input: { providerFixtureId: number; isTest?: boolean }) {
  if (!Number.isInteger(input.providerFixtureId) || input.providerFixtureId <= 0) throw new Error("Fixture ID must be a positive integer.");
  let fixture = await prisma.footballFixture.findUnique({ where: { providerFixtureId: input.providerFixtureId } });
  if (!fixture) {
    const payload = await apiFootballClient.get("/fixtures", { id: input.providerFixtureId }, { type: "RESERVED", fixtureId: input.providerFixtureId });
    const raw = responseRows(payload)[0];
    const parsed = providerFixture(raw);
    if (!parsed) throw new Error("API-Football did not return this fixture.");
    fixture = await saveProviderFixture(raw, { isTest: Boolean(input.isTest) });
  }
  if (isTerminalFixtureStatus(fixture.status) || ["PST", "CANC", "ABD", "AWD", "WO"].includes(fixture.status)) {
    throw new Error("Cannot start live tracking for a finished, postponed, or cancelled fixture.");
  }
  if (fixture.isTestFixture && !input.isTest) {
    fixture = await prisma.footballFixture.update({
      where: { id: fixture.id },
      data: { isTestFixture: false },
    });
  }
  const existing = await prisma.footballLiveTracking.findUnique({ where: { fixtureId: fixture.id } });
  if (existing && ["RECORDING", "SCHEDULED", "INTERRUPTED"].includes(existing.status)) return existing;
  const collectorSettings = await prisma.footballCollectorSettings.findUnique({
    where: { id: "default" }, select: { oddsIntervalMinutes: true },
  });

  const tracking = await prisma.footballLiveTracking.upsert({
    where: { fixtureId: fixture.id },
    create: {
      fixtureId: fixture.id,
      status: isLiveFixtureStatus(fixture.status) ? "RECORDING" : "SCHEDULED",
      scheduledAt: new Date(),
      ...(isLiveFixtureStatus(fixture.status) ? { startedAt: new Date() } : {}),
      slots: { create: snapshotSlotDefinitions(collectorSettings?.oddsIntervalMinutes ?? FOOTBALL_DEFAULTS.oddsIntervalMinutes) },
    },
    update: {
      isEnabled: true,
      status: isLiveFixtureStatus(fixture.status) ? "RECORDING" : "SCHEDULED",
      scheduledAt: new Date(),
      ...(isLiveFixtureStatus(fixture.status) ? { startedAt: new Date() } : { startedAt: null }),
      completedAt: null,
      lastError: null,
    },
  });
  await prisma.footballCollectorLog.create({ data: {
    trackingId: tracking.id, level: "INFO", action: "TRACKING_STARTED",
    message: `Live tracking enabled for fixture ${fixture.providerFixtureId}.`,
    details: { providerFixtureId: fixture.providerFixtureId, test: Boolean(input.isTest) },
  } });
  return tracking;
}

export async function cancelFixtureTracking(id: string) {
  const tracking = await prisma.footballLiveTracking.findFirst({
    where: { OR: [{ id }, { fixture: { providerFixtureId: Number(id) || -1 } }] },
    include: { fixture: true },
  });
  if (!tracking) return null;
  if (tracking.status === "COMPLETED") throw new Error("Completed tracking history cannot be cancelled.");
  const updated = await prisma.footballLiveTracking.update({
    where: { id: tracking.id }, data: { status: "CANCELLED", isEnabled: false, lastError: null },
  });
  await prisma.footballCollectorLog.create({ data: {
    trackingId: tracking.id, level: "INFO", action: "TRACKING_CANCELLED",
    message: `Live tracking cancelled for fixture ${tracking.fixture.providerFixtureId}.`,
  } });
  return updated;
}

export async function listLiveTrackings() {
  const rows = await prisma.footballLiveTracking.findMany({
    where: { status: { in: ["SCHEDULED", "RECORDING", "INTERRUPTED", "PAUSED"] } },
    orderBy: { fixture: { kickoffAt: "asc" } },
    include: {
      fixture: { include: { league: { select: { key: true, shortName: true } } } },
      slots: { where: { NOT: { slotKey: "PREMATCH_5" } }, orderBy: { targetMinute: "desc" }, take: 1 },
      odds: {
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: { capturedAt: true, homeCornerKicks: true, awayCornerKicks: true },
      },
      _count: { select: { odds: true, slots: { where: { status: { in: ["MISSED", "MISSING"] } } } } },
    },
  });
  rows.sort((left, right) => {
    const leftIsLive = left.status === "RECORDING" || isLiveFixtureStatus(left.fixture.status);
    const rightIsLive = right.status === "RECORDING" || isLiveFixtureStatus(right.fixture.status);
    return Number(rightIsLive) - Number(leftIsLive) ||
      left.fixture.kickoffAt.getTime() - right.fixture.kickoffAt.getTime() ||
      left.fixture.providerFixtureId - right.fixture.providerFixtureId;
  });
  return rows.map((tracking) => {
    const { odds, ...trackingData } = tracking;
    const latestOdds = odds[0];
    return {
      ...trackingData,
      fixture: { ...tracking.fixture, kickoffAt: tracking.fixture.kickoffAt.toISOString() },
      scheduledAt: tracking.scheduledAt.toISOString(),
      startedAt: tracking.startedAt?.toISOString() ?? null,
      lastPolledAt: tracking.lastPolledAt?.toISOString() ?? null,
      completedAt: tracking.completedAt?.toISOString() ?? null,
      lastSlot: tracking.slots[0] ? { ...tracking.slots[0], capturedAt: tracking.slots[0].capturedAt?.toISOString() ?? null } : null,
      latestOddsAt: latestOdds?.capturedAt.toISOString() ?? null,
      latestHomeCornerKicks: latestOdds?.homeCornerKicks ?? null,
      latestAwayCornerKicks: latestOdds?.awayCornerKicks ?? null,
      snapshotCount: tracking._count.odds,
      missingSnapshotCount: tracking._count.slots,
    };
  });
}

export async function getTrackingOdds(id: string, page = 1) {
  const tracking = await prisma.footballLiveTracking.findFirst({
    where: { OR: [{ id }, { fixture: { providerFixtureId: Number(id) || -1 } }] },
    include: { fixture: { select: { homeTeamName: true, awayTeamName: true, providerFixtureId: true } } },
  });
  if (!tracking) return null;
  const take = 100;
  const [odds, total, slots] = await Promise.all([
    prisma.footballOddsSnapshot.findMany({
      where: { trackingId: tracking.id, ...VISIBLE_ODDS_HISTORY }, orderBy: { capturedAt: "desc" },
      skip: (Math.max(1, page) - 1) * take, take,
    }),
    prisma.footballOddsSnapshot.count({ where: { trackingId: tracking.id, ...VISIBLE_ODDS_HISTORY } }),
    prisma.footballTrackingSlot.findMany({ where: { trackingId: tracking.id }, orderBy: { targetMinute: "asc" } }),
  ]);
  return {
    tracking,
    fixture: tracking.fixture,
    odds: odds.map((snapshot) => ({ ...snapshot, ...displayHandicapLines(snapshot), capturedAt: snapshot.capturedAt.toISOString(), providerUpdatedAt: snapshot.providerUpdatedAt?.toISOString() ?? null })),
    slots: slots.filter((slot) => slot.period !== "PREMATCH" || slot.slotKey === PREMATCH_SLOT_KEY)
      .map((slot) => ({ ...slot, capturedAt: slot.capturedAt?.toISOString() ?? null })),
    page, pageSize: take, total,
  };
}

export async function syncFixtureResult(providerFixtureId: number) {
  const fixture = await prisma.footballFixture.findUnique({ where: { providerFixtureId } });
  if (!fixture) throw new Error("Fixture was not found in the database.");
  const payload = await apiFootballClient.get("/fixtures", { id: providerFixtureId }, { type: "RESERVED", fixtureId: providerFixtureId });
  const raw = responseRows(payload)[0];
  const updatedFixture = providerFixture(raw);
  if (!updatedFixture) throw new Error("API-Football did not return fixture result data.");
  if (["PST", "CANC", "ABD", "AWD", "WO"].includes(updatedFixture.status)) {
    await prisma.footballFixture.update({ where: { id: fixture.id }, data: { status: updatedFixture.status, lastSyncedAt: new Date() } });
    return { resultStatus: fixture.resultStatus, fixtureStatus: updatedFixture.status, message: "Fixture is not finished; result was not marked as FT." };
  }
  if (!isTerminalFixtureStatus(updatedFixture.status)) throw new Error("Fixture has not finished yet.");
  const resultStatus = resultStatusFromScores(updatedFixture);
  let cornerResults: FixtureCornerResults | null = null;
  if ([fixture.homeCornerKicksHt, fixture.awayCornerKicksHt, fixture.homeCornerKicksFt, fixture.awayCornerKicksFt].some((value) => value === null)) {
    try {
      cornerResults = await fetchFixtureCornerResults(providerFixtureId, {
        homeId: updatedFixture.homeTeamId,
        awayId: updatedFixture.awayTeamId,
        homeName: updatedFixture.homeTeamName,
        awayName: updatedFixture.awayTeamName,
      });
    } catch {
      // Corner results are supplementary and must not block score synchronization.
    }
  }
  const result = await prisma.footballFixture.update({
    where: { id: fixture.id },
    data: {
      status: updatedFixture.status,
      elapsedMinute: updatedFixture.elapsedMinute,
      homeScore: updatedFixture.homeScore,
      awayScore: updatedFixture.awayScore,
      homeScoreHt: updatedFixture.homeScoreHt,
      awayScoreHt: updatedFixture.awayScoreHt,
      homeScoreFt: updatedFixture.homeScoreFt,
      awayScoreFt: updatedFixture.awayScoreFt,
      homeCornerKicksHt: cornerResults?.homeCornerKicksHt ?? fixture.homeCornerKicksHt,
      awayCornerKicksHt: cornerResults?.awayCornerKicksHt ?? fixture.awayCornerKicksHt,
      homeCornerKicksFt: cornerResults?.homeCornerKicksFt ?? fixture.homeCornerKicksFt,
      awayCornerKicksFt: cornerResults?.awayCornerKicksFt ?? fixture.awayCornerKicksFt,
      resultStatus,
      resultSource: "API",
      resultUpdatedAt: new Date(),
      lastSyncedAt: new Date(),
    },
  });
  await settleFixtureOdds(fixture.id);
  const tracking = await prisma.footballLiveTracking.findUnique({ where: { fixtureId: fixture.id } });
  if (tracking && tracking.status !== "CANCELLED") {
    await prisma.footballLiveTracking.update({ where: { id: tracking.id }, data: { status: "COMPLETED", isEnabled: false, completedAt: new Date() } });
  }
  return { resultStatus: result.resultStatus, fixtureStatus: result.status, homeScoreHt: result.homeScoreHt, awayScoreHt: result.awayScoreHt, homeScoreFt: result.homeScoreFt, awayScoreFt: result.awayScoreFt };
}

export async function updateFixtureResultManually(providerFixtureId: number, input: {
  homeScoreHt: number; awayScoreHt: number; homeScoreFt: number; awayScoreFt: number;
}) {
  const fixture = await prisma.footballFixture.findUnique({ where: { providerFixtureId } });
  if (!fixture) throw new Error("Fixture was not found in the database.");
  const values = Object.values(input);
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 99)) throw new Error("Scores must be whole numbers between 0 and 99.");
  const result = await prisma.footballFixture.update({
    where: { id: fixture.id },
    data: {
      homeScoreHt: input.homeScoreHt, awayScoreHt: input.awayScoreHt,
      homeScoreFt: input.homeScoreFt, awayScoreFt: input.awayScoreFt,
      homeScore: input.homeScoreFt, awayScore: input.awayScoreFt,
      resultStatus: "RESULT_MANUAL", resultSource: "MANUAL", resultUpdatedAt: new Date(),
    },
  });
  await settleFixtureOdds(fixture.id);
  return { providerFixtureId, resultStatus: result.resultStatus };
}

export async function listMissingResults(input: { leagueId?: number; from?: string; to?: string; page?: number }) {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const take = 50;
  const where: Prisma.FootballFixtureWhereInput = {
    oddsSnapshots: { some: {} },
    status: { in: ["FT", "AET", "PEN"] },
    resultStatus: { in: ["RESULT_PENDING", "RESULT_MISSING"] },
    ...(input.leagueId ? { providerLeagueId: input.leagueId } : {}),
    ...(input.from || input.to ? { kickoffAt: {
      ...(input.from ? { gte: vietnamDateBoundary(input.from) } : {}),
      ...(input.to ? { lte: vietnamDateBoundary(input.to, true) } : {}),
    } } : {}),
  };
  const [fixtures, total] = await Promise.all([
    prisma.footballFixture.findMany({ where, orderBy: { kickoffAt: "desc" }, skip: (page - 1) * take, take }),
    prisma.footballFixture.count({ where }),
  ]);
  return { fixtures: fixtures.map((fixture) => ({ ...fixture, kickoffAt: fixture.kickoffAt.toISOString() })), page, pageSize: take, total };
}

export async function saveManualCollectorSettings(input: {
  isEnabled?: boolean; oddsIntervalMinutes?: number; fixtureSyncIntervalHours?: number;
  statusCheckIntervalSeconds?: number; preferredBookmakerId?: number | null;
}) {
  return prisma.footballCollectorSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      isEnabled: FOOTBALL_DEFAULTS.collectorEnabled,
      oddsIntervalMinutes: FOOTBALL_DEFAULTS.oddsIntervalMinutes,
      fixtureSyncIntervalHours: FOOTBALL_DEFAULTS.fixtureSyncIntervalHours,
      statusCheckIntervalSeconds: FOOTBALL_DEFAULTS.statusCheckIntervalSeconds,
      ...input,
    },
    update: input,
  });
}

export async function readCollectorSettings() {
  return prisma.footballCollectorSettings.upsert({
    where: { id: "default" }, update: {}, create: {
      id: "default",
      isEnabled: FOOTBALL_DEFAULTS.collectorEnabled,
      oddsIntervalMinutes: FOOTBALL_DEFAULTS.oddsIntervalMinutes,
      fixtureSyncIntervalHours: FOOTBALL_DEFAULTS.fixtureSyncIntervalHours,
      statusCheckIntervalSeconds: FOOTBALL_DEFAULTS.statusCheckIntervalSeconds,
    },
  });
}

export async function recordCollectorLog(input: {
  level: string; action: string; message: string; trackingId?: string | null; details?: Prisma.InputJsonValue;
}) {
  await prisma.footballCollectorLog.create({ data: input });
}

export async function healthDatabase() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "CONNECTED", responseTimeMs: Date.now() - startedAt, checkedAt: new Date().toISOString() };
  } catch {
    return { status: "ERROR", responseTimeMs: Date.now() - startedAt, checkedAt: new Date().toISOString(), message: "Could not connect to the configured database." };
  }
}

export async function healthApi() {
  const checkedAt = new Date();
  if (!(process.env.APIFOOTBALL_KEY || process.env.API_FOOTBALL_KEY)) {
    return { status: "DISCONNECTED", apiKeyConfigured: false, httpStatus: null, responseTimeMs: null, dailyLimit: null, requestsUsedToday: null, requestsRemaining: null, minuteLimit: null, minuteRemaining: null, lastCheckedAt: checkedAt.toISOString() };
  }
  try {
    const payload = obj(await apiFootballClient.get("/status", {}, { type: "RESERVED" }));
    const response = obj(payload?.response);
    const requests = obj(response?.requests);
    const account = obj(response?.account);
    const subscription = obj(response?.subscription);
    const log = await prisma.footballApiRequestLog.findFirst({ where: { endpoint: "/status" }, orderBy: { requestedAt: "desc" } });
    const quota = await import("./quota").then((module) => module.getQuotaOverview(checkedAt));
    return {
      status: "CONNECTED",
      apiKeyConfigured: true,
      httpStatus: log?.statusCode ?? null,
      responseTimeMs: log?.durationMs ?? null,
      dailyLimit: toInt(requests?.limit_day) ?? log?.dailyQuotaLimit ?? quota?.providerDailyLimit ?? null,
      requestsUsedToday: toInt(requests?.current) ?? null,
      requestsRemaining: quota.providerRemaining ?? log?.dailyQuotaRemaining ?? null,
      minuteLimit: log?.minuteQuotaLimit ?? quota.providerMinuteLimit ?? null,
      minuteRemaining: quota.providerMinuteRemaining ?? log?.minuteQuotaRemaining ?? null,
      plan: typeof subscription?.plan === "string" ? subscription.plan : null,
      accountConnected: Boolean(account),
      lastCheckedAt: log?.requestedAt.toISOString() ?? checkedAt.toISOString(),
    };
  } catch (error) {
    const rateLimited = isProviderRateLimited({
      statusCode: typeof obj(error)?.statusCode === "number" ? obj(error)?.statusCode as number : null,
      message: error instanceof Error ? error.message : null,
    });
    return {
      status: rateLimited ? "RATE_LIMITED" : "ERROR",
      apiKeyConfigured: true,
      httpStatus: typeof obj(error)?.statusCode === "number" ? obj(error)?.statusCode : null,
      responseTimeMs: null,
      dailyLimit: null, requestsUsedToday: null, requestsRemaining: null,
      minuteLimit: null, minuteRemaining: null,
      lastCheckedAt: checkedAt.toISOString(),
      message: error instanceof Error ? error.message : "Provider request failed.",
    };
  }
}

export async function healthCollector() {
  const settings = await readCollectorSettings();
  const now = new Date();
  const online = Boolean(settings.heartbeatAt && now.getTime() - settings.heartbeatAt.getTime() <= Math.max(90_000, settings.statusCheckIntervalSeconds * 2_000));
  const [recordingCount, waitingCount, missingResultsCount, lastSuccess, latestError, quota] = await Promise.all([
    prisma.footballLiveTracking.count({ where: { status: "RECORDING", isEnabled: true } }),
    prisma.footballLiveTracking.count({ where: { status: "SCHEDULED", isEnabled: true } }),
    prisma.footballFixture.count({ where: { oddsSnapshots: { some: {} }, status: { in: ["FT", "AET", "PEN"] }, resultStatus: { in: ["RESULT_PENDING", "RESULT_MISSING"] } } }),
    prisma.footballOddsSnapshot.findFirst({ orderBy: { capturedAt: "desc" }, select: { capturedAt: true } }),
    prisma.footballCollectorLog.findFirst({ where: { level: "ERROR" }, orderBy: { createdAt: "desc" }, select: { message: true, createdAt: true } }),
    import("./quota").then((module) => module.getQuotaOverview(now)),
  ]);
  const rateLimited = shouldPauseForQuota({ ...quota, recordingCount, waitingCount, missingResultsCount });
  return {
    status: rateLimited ? "RATE_LIMITED" : online ? "CONNECTED" : "DISCONNECTED",
    collectionEnabled: settings.isEnabled,
    workerOnline: online,
    heartbeatAt: settings.heartbeatAt?.toISOString() ?? null,
    workerId: settings.workerId,
    recordingCount,
    waitingCount,
    missingResultsCount,
    lastSuccessfulCollectionAt: lastSuccess?.capturedAt.toISOString() ?? null,
    lastError: latestError ? { message: latestError.message, at: latestError.createdAt.toISOString() } : settings.lastError ? { message: settings.lastError, at: null } : null,
    quotaStatus: rateLimited ? "RATE_LIMITED" : "AVAILABLE",
  };
}

export async function listCollectorLogs(page = 1) {
  const take = 50;
  const [logs, total, requestLogs] = await Promise.all([
    prisma.footballCollectorLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { tracking: { include: { fixture: { select: { homeTeamName: true, awayTeamName: true, providerFixtureId: true } } } } },
    }),
    prisma.footballCollectorLog.count(),
    prisma.footballApiRequestLog.findMany({ orderBy: { requestedAt: "desc" }, take }),
  ]);
  return {
    logs: logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() })),
    apiUsage: requestLogs.map((log) => ({ ...log, requestedAt: log.requestedAt.toISOString() })),
    total, page, pageSize: take,
  };
}

