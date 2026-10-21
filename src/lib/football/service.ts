import { prisma } from "../prisma";
import { Prisma } from "@prisma/client";
import { FOOTBALL_DEFAULTS, footballDateKey, getUtcDate, shiftFootballDate } from "./config";
import { FOOTBALL_LEAGUES, footballJobName, isSupportedFootballLeague } from "./leagues";
import { apiFootballClient } from "./api-client";
import { displayHandicapLines, parseStructuredLiveMarkets, PREMATCH_SLOT_KEY } from "./markets";
import { compactSnapshotHash } from "./snapshot-hash";
import { emptyFixtureStatistics, fetchFixtureStatistics } from "./statistics";
import { settleFixtureOdds, type SnapshotSettlement } from "./settlement";
import {
  normalizeLiveOdds,
  providerFixture,
  rawResponseFixture,
  type NormalizedLiveOdds,
} from "./normalizer";

const FINISHED_STATUSES = ["FT", "AET", "PEN", "CANC", "PST", "ABD", "AWD", "WO"];
const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE", "SUSP"];
const VISIBLE_ODDS_HISTORY: Prisma.FootballOddsSnapshotWhereInput = {
  OR: [
    { sourceType: "LIVE" },
    { sourceType: "PREMATCH", slotKey: PREMATCH_SLOT_KEY },
  ],
};

export async function getCollectorJobs() {
  const catalogRows = await Promise.all(FOOTBALL_LEAGUES.map((league) =>
    prisma.footballLeague.upsert({
      where: { apiLeagueId: league.id },
      update: {},
      create: {
        key: league.key,
        apiLeagueId: league.id,
        name: league.name,
        shortName: league.shortName,
        country: league.country,
        season: FOOTBALL_DEFAULTS.season,
        isEnabled: true,
      },
    }),
  ));
  const primaryJob = await prisma.footballCollectorJob.upsert({
    where: { jobName: footballJobName(39) },
    update: {},
    create: {
      jobName: footballJobName(39),
      mode: "PRODUCTION",
      enabled: true,
      leagueId: 39,
      season: FOOTBALL_DEFAULTS.season,
      pollingIntervalSeconds: FOOTBALL_DEFAULTS.livePollingIntervalSeconds,
      dailyTotalLimit: FOOTBALL_DEFAULTS.dailyTotalLimit,
      dailyOddsBudget: FOOTBALL_DEFAULTS.dailyOddsBudget,
      dailyReservedBudget: FOOTBALL_DEFAULTS.dailyReservedBudget,
      status: "IDLE",
    },
  });

  await Promise.all(FOOTBALL_LEAGUES.filter((league) => league.id !== 39).map((league) =>
    prisma.footballCollectorJob.upsert({
      where: { jobName: footballJobName(league.id) },
      update: {},
      create: {
        jobName: footballJobName(league.id),
        mode: "PRODUCTION",
        enabled: catalogRows.find((row) => row.apiLeagueId === league.id)?.isEnabled ?? primaryJob.enabled,
        leagueId: league.id,
        season: primaryJob.season,
        pollingIntervalSeconds: primaryJob.pollingIntervalSeconds,
        dailyTotalLimit: primaryJob.dailyTotalLimit,
        dailyOddsBudget: primaryJob.dailyOddsBudget,
        dailyReservedBudget: primaryJob.dailyReservedBudget,
        status: "IDLE",
      },
    }),
  ));

  const jobs = await prisma.footballCollectorJob.findMany({
    where: { jobName: { in: FOOTBALL_LEAGUES.map((league) => footballJobName(league.id)) } },
  });
  return FOOTBALL_LEAGUES.map((league) => ({
    ...league,
    ...jobs.find((job) => job.leagueId === league.id)!,
  }));
}

export function isTerminalFixtureStatus(status: string) {
  return FINISHED_STATUSES.includes(status.toUpperCase());
}

export function isLiveFixtureStatus(status: string) {
  return LIVE_STATUSES.includes(status.toUpperCase());
}

export async function getOverview() {
  const now = new Date();
  const dayStart = getUtcDate(now);
  const jobs = await getCollectorJobs();
  const primaryJob = jobs.find((job) => job.leagueId === 39)!;
  const [quota, requestCount, snapshots, liveFixtures, latestRequest, collectorHealth, trackingCounts] =
    await Promise.all([
      import("./quota").then((module) => module.getQuotaOverview(now)),
      prisma.footballApiRequestLog.count({ where: { requestedAt: { gte: dayStart } } }),
      prisma.footballOddsSnapshot.count({ where: { isTest: false } }),
      prisma.footballFixture.findMany({
        where: {
          isTestFixture: false,
          status: { in: LIVE_STATUSES },
        },
        orderBy: { kickoffAt: "asc" },
        take: 20,
        select: {
          id: true,
          providerFixtureId: true,
          providerLeagueId: true,
          homeTeamName: true,
          awayTeamName: true,
          homeTeamLogo: true,
          awayTeamLogo: true,
          kickoffAt: true,
          status: true,
          elapsedMinute: true,
          homeScore: true,
          awayScore: true,
          _count: { select: { oddsSnapshots: { where: { isTest: false } } } },
        },
      }),
      prisma.footballApiRequestLog.findFirst({
        orderBy: { requestedAt: "desc" },
        select: { requestedAt: true, endpoint: true, success: true },
      }),
      import("./operations").then((module) => module.healthCollector()),
      Promise.all([
        prisma.footballLiveTracking.count({ where: { isEnabled: true, status: "RECORDING" } }),
        prisma.footballLiveTracking.count({ where: { isEnabled: true, status: "SCHEDULED" } }),
      ]),
    ]);
  const enabledJobs = jobs.filter((job) => job.enabled);
  const latestDate = (dates: Array<Date | null>) => dates
    .filter((value): value is Date => value !== null)
    .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;
  const latestSyncAt = latestDate(jobs.map((job) => job.lastFixtureSyncAt));
  const latestRunAt = latestDate(jobs.map((job) => job.lastRunAt));
  const latestSuccessAt = latestDate(jobs.map((job) => job.lastSuccessAt));
  const nextRunAt = jobs
    .map((job) => job.nextRunAt)
    .filter((value): value is Date => value !== null && value >= now)
    .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;

  return {
    collector: {
      enabled: enabledJobs.length > 0 && collectorHealth.collectionEnabled,
      collectionEnabled: collectorHealth.collectionEnabled,
      workerOnline: collectorHealth.workerOnline,
      mode: primaryJob.mode,
      leagueId: primaryJob.leagueId,
      season: primaryJob.season,
      status: !collectorHealth.collectionEnabled ? "PAUSED" : collectorHealth.status,
      pollingIntervalSeconds: primaryJob.pollingIntervalSeconds,
      lastRunAt: latestRunAt?.toISOString() ?? null,
      lastSuccessAt: latestSuccessAt?.toISOString() ?? null,
      nextRunAt: nextRunAt?.toISOString() ?? null,
      lastFixtureSyncAt: latestSyncAt?.toISOString() ?? null,
      lastError: enabledJobs.find((job) => job.lastError)?.lastError ?? null,
      enabledLeagueCount: enabledJobs.length,
      trackingRecordingCount: trackingCounts[0],
      trackingWaitingCount: trackingCounts[1],
      quotaStatus: quota.remaining <= 0 || ((trackingCounts[0] > 0 || trackingCounts[1] > 0) && (quota.oddsRemaining <= 0 || quota.reservedRemaining <= 0))
        ? "RATE_LIMITED"
        : "AVAILABLE",
      heartbeatAt: collectorHealth.heartbeatAt,
    },
    collectors: jobs.map((job) => ({
      id: job.id,
      top: job.top,
      leagueId: job.leagueId,
      name: job.name,
      country: job.country,
      shortName: job.shortName,
      enabled: job.enabled,
      season: job.season,
      status: job.status,
      lastFixtureSyncAt: job.lastFixtureSyncAt?.toISOString() ?? null,
      nextRunAt: job.nextRunAt?.toISOString() ?? null,
      lastError: job.lastError,
    })),
    quota,
    requestsToday: requestCount,
    snapshotsSaved: snapshots,
    liveFixtures: liveFixtures.map((fixture) => ({
      ...fixture,
      kickoffAt: fixture.kickoffAt.toISOString(),
      snapshotCount: fixture._count.oddsSnapshots,
    })),
    latestRequest: latestRequest
      ? { ...latestRequest, requestedAt: latestRequest.requestedAt.toISOString() }
      : null,
    lastSyncAt: latestSyncAt?.toISOString() ?? null,
    serverConfigured: Boolean(process.env.API_FOOTBALL_KEY),
  };
}

export async function listFixtures(filter: string, page: number) {
  const where = filter === "LIVE"
    ? { isTestFixture: false, status: { in: LIVE_STATUSES } }
    : filter === "UPCOMING"
      ? { isTestFixture: false, status: { in: ["NS", "TBD"] } }
      : filter === "FINISHED"
        ? { isTestFixture: false, status: { in: FINISHED_STATUSES } }
        : filter === "TEST"
          ? { OR: [{ isTestFixture: true }, { oddsSnapshots: { some: { isTest: true } } }] }
          : { isTestFixture: false };
  const take = 40;
  const [fixtures, total] = await Promise.all([
    prisma.footballFixture.findMany({
      where,
      orderBy: [{ kickoffAt: "desc" }],
      skip: (page - 1) * take,
      take,
      include: {
        _count: { select: { oddsSnapshots: { where: { isTest: filter === "TEST" } } } },
        oddsSnapshots: {
          where: { isTest: filter === "TEST" },
          orderBy: { capturedAt: "desc" },
          take: 1,
          select: { capturedAt: true },
        },
      },
    }),
    prisma.footballFixture.count({ where }),
  ]);
  return {
    fixtures: fixtures.map(({ oddsSnapshots, _count, ...fixture }) => ({
      ...fixture,
      snapshotCount: _count.oddsSnapshots,
      lastOddsAt: oddsSnapshots[0]?.capturedAt.toISOString() ?? null,
      kickoffAt: fixture.kickoffAt.toISOString(),
      lastSyncedAt: fixture.lastSyncedAt?.toISOString() ?? null,
    })),
    page,
    total,
    pageSize: take,
  };
}

const fixtureHistoryBaseSelect = {
  id: true,
  capturedAt: true,
  isTest: true,
  sourceType: true,
  slotKey: true,
  targetMinute: true,
  actualMinute: true,
  period: true,
  homeScore: true,
  awayScore: true,
  fixtureStatus: true,
  dataStatus: true,
  ahHtLine: true,
  ahHtHomePrice: true,
  ahHtAwayPrice: true,
  ahFtLine: true,
  ahFtHomePrice: true,
  ahFtAwayPrice: true,
  ouHtLine: true,
  ouHtOverPrice: true,
  ouHtUnderPrice: true,
  ouFtLine: true,
  ouFtOverPrice: true,
  ouFtUnderPrice: true,
} satisfies Prisma.FootballOddsSnapshotSelect;

const fixtureHistoryWithCornersSelect = {
  ...fixtureHistoryBaseSelect,
  settlementData: true,
  homeCornerKicks: true,
  awayCornerKicks: true,
  cornerAhHtLine: true,
  cornerAhHtHomePrice: true,
  cornerAhHtAwayPrice: true,
  cornerOuHtLine: true,
  cornerOuHtOverPrice: true,
  cornerOuHtUnderPrice: true,
  cornerAhFtLine: true,
  cornerAhFtHomePrice: true,
  cornerAhFtAwayPrice: true,
  cornerOuFtLine: true,
  cornerOuFtOverPrice: true,
  cornerOuFtUnderPrice: true,
} satisfies Prisma.FootballOddsSnapshotSelect;

type FixtureHistorySnapshot = Prisma.FootballOddsSnapshotGetPayload<{
  select: typeof fixtureHistoryWithCornersSelect;
}>;

export async function getFixtureDetails(id: string) {
  const fixture = await prisma.footballFixture.findUnique({ where: { id } });
  if (!fixture) return null;

  await settleFixtureOdds(id);

  let snapshots: FixtureHistorySnapshot[];
  try {
    snapshots = await prisma.footballOddsSnapshot.findMany({
      where: { fixtureId: id, ...VISIBLE_ODDS_HISTORY },
      orderBy: { capturedAt: "desc" },
      take: 100,
      select: fixtureHistoryWithCornersSelect,
    });
  } catch (error) {
    // Older databases may not yet have the optional corner-odds columns.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2022") throw error;
    const legacySnapshots = await prisma.footballOddsSnapshot.findMany({
      where: { fixtureId: id, ...VISIBLE_ODDS_HISTORY },
      orderBy: { capturedAt: "desc" },
      take: 100,
      select: fixtureHistoryBaseSelect,
    });
    snapshots = legacySnapshots.map((snapshot) => ({
      ...snapshot,
      cornerAhHtLine: null,
      cornerAhHtHomePrice: null,
      cornerAhHtAwayPrice: null,
      cornerOuHtLine: null,
      cornerOuHtOverPrice: null,
      cornerOuHtUnderPrice: null,
      cornerAhFtLine: null,
      cornerAhFtHomePrice: null,
      cornerAhFtAwayPrice: null,
      cornerOuFtLine: null,
      cornerOuFtOverPrice: null,
      cornerOuFtUnderPrice: null,
      homeCornerKicks: null,
      awayCornerKicks: null,
      settlementData: null,
    }));
  }

  return {
    ...fixture,
    kickoffAt: fixture.kickoffAt.toISOString(),
    lastSyncedAt: fixture.lastSyncedAt?.toISOString() ?? null,
    oddsSnapshots: snapshots.map((snapshot) => ({
      ...snapshot,
      ...displayHandicapLines(snapshot),
      settlementData: snapshot.settlementData as SnapshotSettlement | null,
      capturedAt: snapshot.capturedAt.toISOString(),
    })),
  };
}

export async function getFixtureHistory(id: string, page: number, testMode?: boolean) {
  const take = 50;
  const fixture = await prisma.footballFixture.findUnique({ where: { id }, select: { id: true } });
  if (!fixture) return null;
  const where = {
    fixtureId: id,
    ...VISIBLE_ODDS_HISTORY,
    ...(testMode === undefined ? {} : { isTest: testMode }),
  };
  const [snapshots, total] = await Promise.all([
    prisma.footballOddsSnapshot.findMany({
      where,
      orderBy: { capturedAt: "desc" },
      skip: (page - 1) * take,
      take,
      select: fixtureHistoryWithCornersSelect,
    }),
    prisma.footballOddsSnapshot.count({ where }),
  ]);
  return {
    snapshots: snapshots.map((snapshot) => ({
      ...snapshot,
      ...displayHandicapLines(snapshot),
      capturedAt: snapshot.capturedAt.toISOString(),
    })),
    page,
    pageSize: take,
    total,
  };
}

export async function listRequestLogs(page: number) {
  const take = 50;
  const [logs, total] = await Promise.all([
    prisma.footballApiRequestLog.findMany({
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.footballApiRequestLog.count(),
  ]);
  return {
    logs: logs.map((log) => ({ ...log, requestedAt: log.requestedAt.toISOString() })),
    page,
    total,
    pageSize: take,
  };
}

export async function findLiveFixtures() {
  const payload = await apiFootballClient.get("/fixtures", { live: "all" }, { type: "RESERVED" });
  const response = (payload as { response: unknown[] }).response;
  return response.map(providerFixture).filter(Boolean);
}

export async function fetchLiveOdds(fixtureId: number) {
  const payload = await apiFootballClient.get(
    "/odds/live",
    { fixture: fixtureId },
    { type: "ODDS", fixtureId },
  );
  const raw = (payload as { response: unknown[] }).response.length
    ? payload
    : { get: "/odds/live", response: [] };
  const normalized = normalizeLiveOdds(raw, fixtureId);
  return {
    raw: payload,
    normalized: publicNormalizedOdds(normalized),
  };
}

function publicNormalizedOdds(normalized: NormalizedLiveOdds) {
  return {
    fixtureId: normalized.fixtureId,
    providerUpdatedAt: normalized.providerUpdatedAt?.toISOString() ?? null,
    status: normalized.status,
    sourceHash: normalized.sourceHash,
    values: normalized.values,
  };
}

type SaveSnapshotInput = {
  fixtureId: number;
  raw: unknown;
  fixture?: ReturnType<typeof providerFixture> | null;
  isTest?: boolean;
};

export async function saveOddsSnapshot({ fixtureId, raw, fixture, isTest = true }: SaveSnapshotInput) {
  const normalized = normalizeLiveOdds(raw, fixtureId);
  const rawFixture = rawResponseFixture(raw);
  const existingFixture = await prisma.footballFixture.findUnique({
    where: { providerFixtureId: fixtureId },
  });
  const rawHasTeamMetadata = Boolean(
    rawFixture &&
    rawFixture.providerLeagueId > 0 &&
    !rawFixture.homeTeamName.startsWith("Home team (") &&
    !rawFixture.awayTeamName.startsWith("Away team ("),
  );
  const providedFixture = fixture ?? (rawHasTeamMetadata ? rawFixture : null) ?? existingFixture;
  const now = new Date();
  const fixtureData = {
    providerFixtureId: fixtureId,
    providerLeagueId: providedFixture?.providerLeagueId ?? FOOTBALL_DEFAULTS.leagueId,
    season: providedFixture?.season ?? FOOTBALL_DEFAULTS.season,
    homeTeamId: providedFixture?.homeTeamId ?? null,
    awayTeamId: providedFixture?.awayTeamId ?? null,
    homeTeamName: providedFixture?.homeTeamName ?? `Fixture ${fixtureId} home`,
    awayTeamName: providedFixture?.awayTeamName ?? `Fixture ${fixtureId} away`,
    homeTeamLogo: providedFixture?.homeTeamLogo ?? null,
    awayTeamLogo: providedFixture?.awayTeamLogo ?? null,
    kickoffAt: providedFixture?.kickoffAt ?? now,
    status: providedFixture?.status ?? "LIVE",
    elapsedMinute: providedFixture?.elapsedMinute ?? null,
    homeScore: providedFixture?.homeScore ?? null,
    awayScore: providedFixture?.awayScore ?? null,
    lastSyncedAt: now,
  };

  const databaseFixture = await prisma.footballFixture.upsert({
    where: { providerFixtureId: fixtureId },
    create: { ...fixtureData, isTestFixture: isTest },
    update: fixtureData,
  });
  const collectorSettings = await prisma.footballCollectorSettings.findUnique({ where: { id: "default" }, select: { preferredBookmakerId: true } });
  const markets = parseStructuredLiveMarkets(normalized.values, { home: fixtureData.homeTeamName, away: fixtureData.awayTeamName }, collectorSettings?.preferredBookmakerId);
  let statistics = emptyFixtureStatistics();
  let statisticsCheckedAt: Date | null = null;
  if (LIVE_STATUSES.includes(fixtureData.status.toUpperCase())) {
    statisticsCheckedAt = now;
    try {
      statistics = await fetchFixtureStatistics(fixtureId, {
        homeId: fixtureData.homeTeamId,
        awayId: fixtureData.awayTeamId,
        homeName: fixtureData.homeTeamName,
        awayName: fixtureData.awayTeamName,
      });
    } catch {
      // Statistics are supplementary; a stats/quota failure must not block snapshot saving.
    }
  }
  const sourceHash = compactSnapshotHash({
    fixtureId: databaseFixture.id,
    sourceType: "LIVE",
    isTest,
    slotKey: null,
    targetMinute: null,
    actualMinute: fixtureData.elapsedMinute,
    period: null,
    homeScore: fixtureData.homeScore,
    awayScore: fixtureData.awayScore,
    homeCornerKicks: statistics.homeCornerKicks,
    awayCornerKicks: statistics.awayCornerKicks,
    fixtureStatus: fixtureData.status,
    markets,
  });

  // Updating the fixture row serializes concurrent snapshot writes for one match.
  return prisma.$transaction(async (transaction) => {
    await transaction.footballFixture.update({
      where: { id: databaseFixture.id },
      data: { lastSyncedAt: now },
    });
    const previous = await transaction.footballOddsSnapshot.findFirst({
      where: { fixtureId: databaseFixture.id, isTest },
      orderBy: { capturedAt: "desc" },
      select: { sourceHash: true, id: true, capturedAt: true },
    });

    if (previous?.sourceHash === sourceHash) {
      return {
        saved: false,
        duplicate: true,
        snapshotId: previous.id,
        capturedAt: previous.capturedAt.toISOString(),
        dataStatus: markets.dataStatus,
      };
    }

    const snapshot = await transaction.footballOddsSnapshot.create({
      data: {
        fixtureId: databaseFixture.id,
        sourceHash,
        sourceType: "LIVE",
        isTest,
        ahHtLine: markets.ahHtLine,
        ahHtHomePrice: markets.ahHtHomePrice,
        ahHtAwayPrice: markets.ahHtAwayPrice,
        ahFtLine: markets.ahFtLine,
        ahFtHomePrice: markets.ahFtHomePrice,
        ahFtAwayPrice: markets.ahFtAwayPrice,
        ouHtLine: markets.ouHtLine,
        ouHtOverPrice: markets.ouHtOverPrice,
        ouHtUnderPrice: markets.ouHtUnderPrice,
        ouFtLine: markets.ouFtLine,
        ouFtOverPrice: markets.ouFtOverPrice,
        ouFtUnderPrice: markets.ouFtUnderPrice,
        cornerAhHtLine: markets.cornerAhHtLine,
        cornerAhHtHomePrice: markets.cornerAhHtHomePrice,
        cornerAhHtAwayPrice: markets.cornerAhHtAwayPrice,
        cornerOuHtLine: markets.cornerOuHtLine,
        cornerOuHtOverPrice: markets.cornerOuHtOverPrice,
        cornerOuHtUnderPrice: markets.cornerOuHtUnderPrice,
        cornerAhFtLine: markets.cornerAhFtLine,
        cornerAhFtHomePrice: markets.cornerAhFtHomePrice,
        cornerAhFtAwayPrice: markets.cornerAhFtAwayPrice,
        cornerOuFtLine: markets.cornerOuFtLine,
        cornerOuFtOverPrice: markets.cornerOuFtOverPrice,
        cornerOuFtUnderPrice: markets.cornerOuFtUnderPrice,
        dataStatus: markets.dataStatus,
        homeScore: fixtureData.homeScore,
        awayScore: fixtureData.awayScore,
        fixtureStatus: fixtureData.status,
        ...statistics,
        statisticsCheckedAt,
      },
    });

    return {
      saved: true,
      duplicate: false,
      snapshotId: snapshot.id,
      capturedAt: snapshot.capturedAt.toISOString(),
      dataStatus: markets.dataStatus,
    };
  }, { isolationLevel: "Serializable" });
}

export async function syncLeagueFixtures(leagueId: number, season = FOOTBALL_DEFAULTS.season) {
  if (!isSupportedFootballLeague(leagueId)) {
    throw new Error(`Unsupported football league ID: ${leagueId}`);
  }
  const now = new Date();
  const todayVietnam = footballDateKey(now);
  const from = shiftFootballDate(todayVietnam, -3);
  const to = shiftFootballDate(todayVietnam, 14);
  const payload = await apiFootballClient.get(
    "/fixtures",
    { league: leagueId, season, from, to, timezone: "Asia/Ho_Chi_Minh" },
    { type: "RESERVED" },
  );
  const fixtures = (payload as { response: unknown[] }).response
    .map(providerFixture)
    .filter((fixture): fixture is NonNullable<typeof fixture> => fixture !== null && fixture !== undefined && fixture.providerLeagueId === leagueId);
  const catalogLeague = await prisma.footballLeague.findUnique({ where: { apiLeagueId: leagueId }, select: { id: true } });

  for (const fixture of fixtures) {
    const existingFixture = await prisma.footballFixture.findUnique({ where: { providerFixtureId: fixture.providerFixtureId }, select: { resultStatus: true } });
    const fixtureData = { ...fixture, leagueCatalogId: catalogLeague?.id ?? null, lastSyncedAt: now };
    const updateData = existingFixture?.resultStatus === "RESULT_MANUAL"
      ? Object.fromEntries(Object.entries(fixtureData).filter(([key]) => !["homeScoreHt", "awayScoreHt", "homeScoreFt", "awayScoreFt"].includes(key)))
      : fixtureData;
    await prisma.footballFixture.upsert({
      where: { providerFixtureId: fixture.providerFixtureId },
      create: { ...fixtureData, isTestFixture: false },
      update: updateData,
    });
  }

  await prisma.footballCollectorJob.update({
    where: { jobName: footballJobName(leagueId) },
    data: { lastFixtureSyncAt: now },
  });
  return { synced: fixtures.length, from, to };
}

export async function syncEnabledLeagueFixtures() {
  const enabledJobs = (await getCollectorJobs()).filter((job) => job.enabled);
  if (!enabledJobs.length) {
    throw new Error("Select at least one competition in settings before syncing fixtures.");
  }

  const results: Array<{ leagueId: number; league: string; synced: number; from: string; to: string }> = [];
  for (const job of enabledJobs) {
    results.push({
      leagueId: job.leagueId,
      league: job.name,
      ...(await syncLeagueFixtures(job.leagueId, job.season)),
    });
  }
  return { leagues: results, synced: results.reduce((total, result) => total + result.synced, 0) };
}

export async function getFootballSettings() {
  const jobs = await getCollectorJobs();
  const job = jobs.find((item) => item.leagueId === 39)!;
  const [settings, collectorSettings] = await Promise.all([
    prisma.footballLeague.findMany({ orderBy: { apiLeagueId: "asc" } }),
    prisma.footballCollectorSettings.upsert({
      where: { id: "default" }, update: {}, create: {
        id: "default",
        isEnabled: FOOTBALL_DEFAULTS.collectorEnabled,
        oddsIntervalMinutes: FOOTBALL_DEFAULTS.oddsIntervalMinutes,
        fixtureSyncIntervalHours: FOOTBALL_DEFAULTS.fixtureSyncIntervalHours,
        statusCheckIntervalSeconds: FOOTBALL_DEFAULTS.statusCheckIntervalSeconds,
      },
    }),
  ]);
  return {
    leagues: jobs.map(({ top, key, leagueId, name, country, shortName, enabled, status, lastFixtureSyncAt, lastError }) => ({
      top,
      key,
      leagueId,
      name,
      country,
      shortName,
      enabled: settings.find((row) => row.apiLeagueId === leagueId)?.isEnabled ?? enabled,
      status,
      lastFixtureSyncAt: lastFixtureSyncAt?.toISOString() ?? null,
      lastError,
    })),
    season: job.season,
    pollingIntervalSeconds: job.pollingIntervalSeconds,
    dailyTotalLimit: job.dailyTotalLimit,
    dailyOddsBudget: job.dailyOddsBudget,
    dailyReservedBudget: job.dailyReservedBudget,
    livePollingIntervalSeconds: FOOTBALL_DEFAULTS.livePollingIntervalSeconds,
    quotaResetTimezone: FOOTBALL_DEFAULTS.quotaResetTimezone,
    mode: job.mode,
    lastError: job.lastError,
    isCollectorEnabled: collectorSettings.isEnabled,
    oddsIntervalMinutes: collectorSettings.oddsIntervalMinutes,
    fixtureSyncIntervalHours: collectorSettings.fixtureSyncIntervalHours,
    statusCheckIntervalSeconds: collectorSettings.statusCheckIntervalSeconds,
    preferredBookmakerId: collectorSettings.preferredBookmakerId,
  };
}

export async function updateFootballSettings(input: {
  leagueIds: number[];
  season: number;
  pollingIntervalSeconds: number;
  dailyTotalLimit: number;
  dailyOddsBudget: number;
  dailyReservedBudget: number;
  isCollectorEnabled?: boolean;
  oddsIntervalMinutes?: number;
  fixtureSyncIntervalHours?: number;
  statusCheckIntervalSeconds?: number;
  preferredBookmakerId?: number | null;
}) {
  if (input.leagueIds.some((leagueId) => !isSupportedFootballLeague(leagueId))) {
    throw new Error("One or more selected competitions are not supported.");
  }

  const selectedLeagueIds = new Set(input.leagueIds);
  const jobs = await getCollectorJobs();
  await prisma.$transaction(jobs.map((job) => {
    const enabled = selectedLeagueIds.has(job.leagueId);
    const updateJob = prisma.footballCollectorJob.update({
      where: { id: job.id },
      data: {
        enabled,
        season: input.season,
        pollingIntervalSeconds: input.pollingIntervalSeconds,
        dailyTotalLimit: input.dailyTotalLimit,
        dailyOddsBudget: input.dailyOddsBudget,
        dailyReservedBudget: input.dailyReservedBudget,
        ...(input.season !== job.season ? { lastFixtureSyncAt: null } : {}),
        ...(enabled ? { status: "WAITING" } : { status: "DISABLED", lockOwner: null, lockExpiresAt: null }),
        nextRunAt: null,
      },
    });
    const updateLeague = prisma.footballLeague.update({
      where: { apiLeagueId: job.leagueId },
      data: { isEnabled: enabled, season: input.season },
    });
    return [updateJob, updateLeague];
  }).flat());
  const collectorSettings = await prisma.footballCollectorSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      ...(input.isCollectorEnabled !== undefined ? { isEnabled: input.isCollectorEnabled } : {}),
      ...(input.oddsIntervalMinutes !== undefined ? { oddsIntervalMinutes: input.oddsIntervalMinutes } : {}),
      ...(input.fixtureSyncIntervalHours !== undefined ? { fixtureSyncIntervalHours: input.fixtureSyncIntervalHours } : {}),
      ...(input.statusCheckIntervalSeconds !== undefined ? { statusCheckIntervalSeconds: input.statusCheckIntervalSeconds } : {}),
      ...(input.preferredBookmakerId !== undefined ? { preferredBookmakerId: input.preferredBookmakerId } : {}),
    },
    update: {
      ...(input.isCollectorEnabled !== undefined ? { isEnabled: input.isCollectorEnabled } : {}),
      ...(input.oddsIntervalMinutes !== undefined ? { oddsIntervalMinutes: input.oddsIntervalMinutes } : {}),
      ...(input.fixtureSyncIntervalHours !== undefined ? { fixtureSyncIntervalHours: input.fixtureSyncIntervalHours } : {}),
      ...(input.statusCheckIntervalSeconds !== undefined ? { statusCheckIntervalSeconds: input.statusCheckIntervalSeconds } : {}),
      ...(input.preferredBookmakerId !== undefined ? { preferredBookmakerId: input.preferredBookmakerId } : {}),
    },
  });
  if (!collectorSettings.isEnabled) {
    await prisma.footballLiveTracking.updateMany({
      where: { status: { in: ["SCHEDULED", "RECORDING"] } },
      data: { status: "PAUSED", lastError: "Paused because the collector was disabled in settings." },
    });
  } else {
    await prisma.footballLiveTracking.updateMany({
      where: { status: "PAUSED", lastError: "Paused because the collector was disabled in settings." },
      data: { status: "SCHEDULED", lastError: null },
    });
  }
  return getFootballSettings();
}

