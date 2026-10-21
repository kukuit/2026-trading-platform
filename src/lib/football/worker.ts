import { randomUUID } from "node:crypto";
import { prisma } from "../prisma";
import { FOOTBALL_DEFAULTS, footballDateKey, getUtcDate, shiftFootballDate } from "./config";
import { apiFootballClient } from "./api-client";
import { getCollectorJobs, isLiveFixtureStatus, syncLeagueFixtures } from "./service";
import { getQuotaOverview, QuotaExceededError } from "./quota";
import { normalizeLiveOdds, providerFixture } from "./normalizer";
import { captureTrackedOdds, transitionTrackingFromFixture } from "./collector";
import { dueLiveSlot, PREMATCH_MINUTES, PREMATCH_SLOT_KEY } from "./markets";
import { FOOTBALL_LEAGUES } from "./leagues";
import { isProviderRateLimited } from "./collection-rules";

const LEASE_MS = 60_000;
const HEARTBEAT_MS = 25_000;
const MAX_IDLE_RECHECK_MS = 60_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function nextUtcReset(now: Date) {
  const start = getUtcDate(now);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 4000) : "Unknown collector error.";
}

function oddsFixtureId(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const fixture = (raw as Record<string, unknown>).fixture;
  if (!fixture || typeof fixture !== "object") return null;
  const id = Number((fixture as Record<string, unknown>).id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

type PrematchTracking = {
  id: string;
  status: string;
  isEnabled: boolean;
  fixture: {
    id: string;
    providerFixtureId: number;
    kickoffAt: Date;
    status: string;
    elapsedMinute: number | null;
    elapsedExtraTime: number;
    homeScore: number | null;
    awayScore: number | null;
    homeTeamId: number | null;
    awayTeamId: number | null;
    homeScoreHt: number | null;
    awayScoreHt: number | null;
    homeScoreFt: number | null;
    awayScoreFt: number | null;
    homeTeamName: string;
    awayTeamName: string;
    isTestFixture: boolean;
  };
};

async function capturePrematchOdds(trackings: PrematchTracking[], now = new Date()) {
  const windowEnd = now.getTime() + PREMATCH_MINUTES * 60_000;
  for (const tracking of trackings) {
    const fixture = tracking.fixture;
    const kickoffAt = fixture.kickoffAt.getTime();
    const preKickoffWindow = kickoffAt > now.getTime() && kickoffAt <= windowEnd;
    if (!tracking.isEnabled || !["SCHEDULED", "RECORDING", "INTERRUPTED"].includes(tracking.status) ||
      ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"].includes(fixture.status)) continue;

    if (kickoffAt <= now.getTime()) {
      await prisma.footballTrackingSlot.updateMany({
        where: { trackingId: tracking.id, slotKey: PREMATCH_SLOT_KEY, status: "PENDING" },
        data: { status: "MISSED", error: "PRE-MATCH odds were not captured within the 10-minute pre-kickoff window." },
      });
      continue;
    }
    if (!preKickoffWindow) continue;

    const slotKey = PREMATCH_SLOT_KEY;
    await prisma.footballTrackingSlot.upsert({
      where: { trackingId_slotKey: { trackingId: tracking.id, slotKey } },
      create: { trackingId: tracking.id, slotKey, targetMinute: -PREMATCH_MINUTES, period: "PREMATCH" },
      update: {},
    });
    const existing = await prisma.footballOddsSnapshot.findFirst({
      where: { trackingId: tracking.id, slotKey },
      select: { id: true },
    });
    if (existing) continue;

    const endpoint = `/odds?fixture=${fixture.providerFixtureId}`;
    const lastRequest = await prisma.footballApiRequestLog.findFirst({
      where: { endpoint }, orderBy: { requestedAt: "desc" }, select: { requestedAt: true },
    });
    if (lastRequest && now.getTime() - lastRequest.requestedAt.getTime() < 60_000) continue;

    const quota = await getQuotaOverview(now);
    if (quota.remaining <= 0 || quota.oddsRemaining <= 0) continue;

    const payload = await apiFootballClient.get(
      "/odds", { fixture: fixture.providerFixtureId }, { type: "ODDS", fixtureId: fixture.providerFixtureId },
    ) as { response: unknown[] };
    if (!normalizeLiveOdds(payload, fixture.providerFixtureId).values.length) {
      await prisma.footballTrackingSlot.updateMany({
        where: { trackingId: tracking.id, slotKey, status: "PENDING" },
        data: { error: "API-Football has not published pre-match odds yet; retrying within the ten-minute window." },
      });
      continue;
    }

    await captureTrackedOdds({
      trackingId: tracking.id,
      fixture: {
        id: fixture.id,
        providerFixtureId: fixture.providerFixtureId,
        status: fixture.status,
        elapsedMinute: fixture.elapsedMinute,
        elapsedExtraTime: fixture.elapsedExtraTime,
        homeScore: fixture.homeScore ?? 0,
        awayScore: fixture.awayScore ?? 0,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        homeScoreHt: fixture.homeScoreHt,
        awayScoreHt: fixture.awayScoreHt,
        homeScoreFt: fixture.homeScoreFt,
        awayScoreFt: fixture.awayScoreFt,
        homeTeamName: fixture.homeTeamName,
        awayTeamName: fixture.awayTeamName,
      },
      raw: payload,
      slotKey,
      targetMinute: -PREMATCH_MINUTES,
      actualMinute: -PREMATCH_MINUTES,
      period: "PREMATCH",
      sourceType: "PREMATCH",
      isTest: fixture.isTestFixture,
    });
  }
}

async function getLiveOddsForFixture(
  fixtureId: number,
  groupedOdds: Map<number, unknown>,
  minimumIntervalSeconds: number,
) {
  const groupedItem = groupedOdds.get(fixtureId);
  if (groupedItem && normalizeLiveOdds({ response: [groupedItem] }, fixtureId).values.length > 0) {
    return groupedItem;
  }

  const endpoint = `/odds/live?fixture=${fixtureId}`;
  const lastRequest = await prisma.footballApiRequestLog.findFirst({
    where: { endpoint }, orderBy: { requestedAt: "desc" }, select: { requestedAt: true },
  });
  if (lastRequest && Date.now() - lastRequest.requestedAt.getTime() < minimumIntervalSeconds * 1000) {
    return null;
  }

  const quota = await getQuotaOverview();
  if (quota.remaining <= 0 || quota.oddsRemaining <= 0) return null;

  const payload = await apiFootballClient.get(
    "/odds/live", { fixture: fixtureId }, { type: "ODDS", fixtureId },
  ) as { response: unknown[] };
  return payload.response.find((item) => {
    const responseFixtureId = oddsFixtureId(item) ?? providerFixture(item)?.providerFixtureId;
    return responseFixtureId === fixtureId &&
      normalizeLiveOdds({ response: [item] }, fixtureId).values.length > 0;
  }) ?? null;
}

async function recoverPersistedTrackingState() {
  const recoverable = await prisma.footballLiveTracking.findMany({
    where: {
      isEnabled: true,
      status: { in: ["SCHEDULED", "RECORDING", "INTERRUPTED"] },
      fixture: { status: { in: ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"] } },
    },
    include: { fixture: true },
  });
  for (const tracking of recoverable) {
    await transitionTrackingFromFixture(tracking.id, tracking.fixture);
  }
}

async function retryOneMissingResult() {
  const settings = await prisma.footballCollectorSettings.findUnique({ where: { id: "default" }, select: { isEnabled: true } });
  if (settings && !settings.isEnabled) return;
  const quota = await getQuotaOverview();
  if (quota.remaining <= 0 || quota.reservedRemaining <= 0) return;
  const retryBefore = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const fixture = await prisma.footballFixture.findFirst({
    where: {
      resultStatus: { in: ["RESULT_PENDING", "RESULT_MISSING"] },
      status: { in: ["FT", "AET", "PEN"] },
      oddsSnapshots: { some: {} },
      OR: [{ resultUpdatedAt: null }, { resultUpdatedAt: { lt: retryBefore } }],
    },
    orderBy: [{ resultUpdatedAt: "asc" }, { kickoffAt: "asc" }],
    select: { providerFixtureId: true },
  });
  if (!fixture) return;
  try {
    await import("./operations").then((module) => module.syncFixtureResult(fixture.providerFixtureId));
  } catch (error) {
    await prisma.footballCollectorLog.create({
      data: {
        level: "ERROR",
        action: "RESULT_SYNC_RETRY_FAILED",
        message: errorText(error),
        details: { providerFixtureId: fixture.providerFixtureId },
      },
    });
  }
}

async function processExternalTrackings() {
  const settings = await prisma.footballCollectorSettings.findUnique({ where: { id: "default" } });
  if (settings && !settings.isEnabled) return;
  const leagueIds = FOOTBALL_LEAGUES.map((league) => league.id);
  const trackings = await prisma.footballLiveTracking.findMany({
    where: {
      isEnabled: true,
      status: { in: ["SCHEDULED", "RECORDING", "INTERRUPTED"] },
      fixture: { providerLeagueId: { notIn: leagueIds } },
    },
    include: { fixture: true },
    orderBy: { fixture: { kickoffAt: "asc" } },
  });
  if (!trackings.length) return;

  const nowMs = Date.now();
  const activeTrackings = trackings.filter((tracking) => {
    const live = isLiveFixtureStatus(tracking.fixture.status);
    const kickoff = tracking.fixture.kickoffAt.getTime();
    return live || (kickoff >= nowMs - 4 * 60 * 60 * 1000 && kickoff <= nowMs + 6 * 60 * 60 * 1000);
  });
  if (!activeTrackings.length) return;

  const configuredStatusInterval = settings?.statusCheckIntervalSeconds ?? FOOTBALL_DEFAULTS.statusCheckIntervalSeconds;
  const ids = activeTrackings.map((tracking) => tracking.fixture.providerFixtureId);
  const byFixtureId = new Map<number, typeof trackings[number]["fixture"]>();
  for (let offset = 0; offset < ids.length; offset += 20) {
    const chunk = ids.slice(offset, offset + 20);
    const endpoint = `/fixtures?ids=${chunk.join("-")}`;
    const lastStatusRequest = await prisma.footballApiRequestLog.findFirst({ where: { endpoint }, orderBy: { requestedAt: "desc" }, select: { requestedAt: true } });
    const chunkTrackings = activeTrackings.filter((tracking) => chunk.includes(tracking.fixture.providerFixtureId));
    const liveOrImminent = chunkTrackings.some((tracking) =>
      isLiveFixtureStatus(tracking.fixture.status) ||
      tracking.fixture.kickoffAt.getTime() <= Date.now() + 15 * 60_000,
    );
    const withinTwoHours = chunkTrackings.some((tracking) =>
      tracking.fixture.kickoffAt.getTime() <= Date.now() + 2 * 60 * 60_000,
    );
    const adaptiveMinimum = liveOrImminent ? configuredStatusInterval : withinTwoHours ? 300 : 900;
    const statusInterval = Math.max(configuredStatusInterval, adaptiveMinimum);
    const shouldCheck = !lastStatusRequest || Date.now() - lastStatusRequest.requestedAt.getTime() >= statusInterval * 1000;
    const quota = await getQuotaOverview();
    if (!shouldCheck || quota.remaining <= 0 || quota.reservedRemaining <= 0) continue;
    const payload = await apiFootballClient.get("/fixtures", { ids: chunk.join("-") }, { type: "RESERVED" }) as { response: unknown[] };
    for (const raw of payload.response) {
      const parsed = providerFixture(raw);
      if (!parsed || !chunk.includes(parsed.providerFixtureId)) continue;
      const tracking = chunkTrackings.find((item) => item.fixture.providerFixtureId === parsed.providerFixtureId);
      const existing = await prisma.footballFixture.findUnique({
        where: { providerFixtureId: parsed.providerFixtureId },
        select: { resultStatus: true, isTestFixture: true },
      });
      const fixtureData = {
        ...parsed,
        leagueCatalogId: null,
        isTestFixture: existing?.isTestFixture ?? tracking?.fixture.isTestFixture ?? false,
        lastSyncedAt: new Date(),
      };
      const updateData = existing?.resultStatus === "RESULT_MANUAL"
        ? Object.fromEntries(Object.entries(fixtureData).filter(([key]) => !["homeScoreHt", "awayScoreHt", "homeScoreFt", "awayScoreFt"].includes(key)))
        : fixtureData;
      const saved = await prisma.footballFixture.upsert({
        where: { providerFixtureId: parsed.providerFixtureId },
        create: fixtureData,
        update: updateData,
      });
      byFixtureId.set(parsed.providerFixtureId, saved);
    }
  }

  for (const tracking of activeTrackings) {
    const updated = byFixtureId.get(tracking.fixture.providerFixtureId);
    if (updated) await transitionTrackingFromFixture(tracking.id, updated);
  }

  const updatedRows = await prisma.footballLiveTracking.findMany({
    where: { id: { in: activeTrackings.map((tracking) => tracking.id) }, isEnabled: true },
    include: { fixture: true },
  });
  await capturePrematchOdds(updatedRows);
  const liveRows = updatedRows.filter((tracking) => isLiveFixtureStatus(tracking.fixture.status));
  if (!liveRows.length) return;
  const currentQuota = await getQuotaOverview();
  const configuredOddsSeconds = Math.max(60, (settings?.oddsIntervalMinutes ?? FOOTBALL_DEFAULTS.oddsIntervalMinutes) * 60);
  const adaptiveOddsSeconds = currentQuota.oddsRemaining <= 10 || currentQuota.remaining <= 15 ? Math.max(configuredOddsSeconds, 900) : configuredOddsSeconds;
  const byLeague = new Map<number, typeof liveRows>();
  for (const tracking of liveRows) {
    const rows = byLeague.get(tracking.fixture.providerLeagueId) ?? [];
    rows.push(tracking);
    byLeague.set(tracking.fixture.providerLeagueId, rows);
  }

  for (const [leagueId, fixtures] of Array.from(byLeague.entries())) {
    const endpoint = `/odds/live?league=${leagueId}`;
    const lastOddsRequest = await prisma.footballApiRequestLog.findFirst({ where: { endpoint }, orderBy: { requestedAt: "desc" }, select: { requestedAt: true } });
    if (lastOddsRequest && Date.now() - lastOddsRequest.requestedAt.getTime() < adaptiveOddsSeconds * 1000) continue;
    const latestQuota = await getQuotaOverview();
    if (latestQuota.remaining <= 0 || latestQuota.oddsRemaining <= 0) continue;
    const payload = await apiFootballClient.get("/odds/live", { league: leagueId }, { type: "ODDS" }) as { response: unknown[] };
    const oddsByFixture = new Map<number, unknown>();
    for (const raw of payload.response) {
      const fixtureId = oddsFixtureId(raw) ?? providerFixture(raw)?.providerFixtureId;
      if (fixtureId) oddsByFixture.set(fixtureId, raw);
    }
    for (const tracking of fixtures) {
      const fixture = tracking.fixture;
      const due = dueLiveSlot(
        fixture.status, fixture.elapsedMinute, fixture.elapsedExtraTime,
        settings?.oddsIntervalMinutes ?? FOOTBALL_DEFAULTS.oddsIntervalMinutes,
      );
      if (!due) continue;
      const exists = await prisma.footballOddsSnapshot.findFirst({
        where: { trackingId: tracking.id, slotKey: due.slotKey }, select: { id: true, dataStatus: true },
      });
      if (exists && exists.dataStatus !== "MISSING") continue;
      const oddsItem = await getLiveOddsForFixture(fixture.providerFixtureId, oddsByFixture, adaptiveOddsSeconds);
      await captureTrackedOdds({
        trackingId: tracking.id,
        fixture: {
          id: fixture.id,
          providerFixtureId: fixture.providerFixtureId,
          status: fixture.status,
          elapsedMinute: fixture.elapsedMinute,
          elapsedExtraTime: fixture.elapsedExtraTime,
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          homeScoreHt: fixture.homeScoreHt,
          awayScoreHt: fixture.awayScoreHt,
          homeScoreFt: fixture.homeScoreFt,
          awayScoreFt: fixture.awayScoreFt,
          homeTeamName: fixture.homeTeamName,
          awayTeamName: fixture.awayTeamName,
        },
        raw: { get: "/odds/live", response: oddsItem ? [oddsItem] : [] },
        isTest: fixture.isTestFixture,
        ...due,
      });
    }
  }
}

async function acquireOrRenewLease(jobId: string, workerId: string) {
  const now = new Date();
  const result = await prisma.footballCollectorJob.updateMany({
    where: {
      id: jobId,
      OR: [
        { lockOwner: workerId },
        { lockExpiresAt: null },
        { lockExpiresAt: { lt: now } },
      ],
    },
    data: { lockOwner: workerId, lockExpiresAt: new Date(now.getTime() + LEASE_MS) },
  });
  return result.count === 1;
}

async function releaseLease(jobId: string, workerId: string) {
  await prisma.footballCollectorJob.updateMany({
    where: { id: jobId, lockOwner: workerId },
    data: { lockOwner: null, lockExpiresAt: null },
  });
}

async function updateJob(jobId: string, data: Parameters<typeof prisma.footballCollectorJob.update>[0]["data"]) {
  await prisma.footballCollectorJob.update({ where: { id: jobId }, data });
}

async function pollFixtureWindow(job: {
  leagueId: number;
  season: number;
  id: string;
  pollingIntervalSeconds: number;
}) {
  const now = new Date();
  // Keep yesterday in the window so tracked fixtures that cross local midnight
  // continue receiving status/minute updates until they finish.
  const today = footballDateKey(now);
  const from = shiftFootballDate(today, -1);
  const to = shiftFootballDate(today, 1);
  const existing = await prisma.footballFixture.findMany({
    where: {
      providerLeagueId: job.leagueId,
      isTestFixture: false,
      kickoffAt: {
        gte: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        lte: new Date(now.getTime() + 15 * 60 * 1000),
      },
    },
    select: { id: true, providerFixtureId: true, status: true, resultStatus: true },
  });
  const latestById = new Map<number, NonNullable<ReturnType<typeof providerFixture>>>();
  const wasLive = existing.some((fixture) => isLiveFixtureStatus(fixture.status));
  const quotaBeforeStatus = await getQuotaOverview(now);
  const collectorSettings = await prisma.footballCollectorSettings.upsert({
    where: { id: "default" }, update: {}, create: {
      id: "default",
      isEnabled: FOOTBALL_DEFAULTS.collectorEnabled,
      oddsIntervalMinutes: FOOTBALL_DEFAULTS.oddsIntervalMinutes,
      fixtureSyncIntervalHours: FOOTBALL_DEFAULTS.fixtureSyncIntervalHours,
      statusCheckIntervalSeconds: FOOTBALL_DEFAULTS.statusCheckIntervalSeconds,
    },
  });
  const statusIntervalSeconds = wasLive
    ? Math.max(collectorSettings.statusCheckIntervalSeconds, quotaBeforeStatus.reservedRemaining <= 3 ? 1800 : collectorSettings.statusCheckIntervalSeconds)
    : Math.max(collectorSettings.statusCheckIntervalSeconds, quotaBeforeStatus.reservedRemaining <= 3 ? 900 : collectorSettings.statusCheckIntervalSeconds);
  const statusEndpoint = `/fixtures?${new URLSearchParams({ league: String(job.leagueId), season: String(job.season), from, to, timezone: "Asia/Ho_Chi_Minh" })}`;
  const lastStatusRequest = await prisma.footballApiRequestLog.findFirst({
    where: { endpoint: statusEndpoint },
    orderBy: { requestedAt: "desc" },
    select: { requestedAt: true },
  });
  const shouldCheckStatus = !lastStatusRequest ||
    now.getTime() - lastStatusRequest.requestedAt.getTime() >= statusIntervalSeconds * 1000;

  if (shouldCheckStatus && quotaBeforeStatus.reservedRemaining > 0 && quotaBeforeStatus.remaining > 0) {
    const payload = await apiFootballClient.get(
      "/fixtures",
      { league: job.leagueId, season: job.season, from, to, timezone: "Asia/Ho_Chi_Minh" },
      { type: "RESERVED" },
    ) as { response: unknown[] };
    for (const row of payload.response) {
      const fixture = providerFixture(row);
      if (!fixture || fixture.providerLeagueId !== job.leagueId) continue;
      latestById.set(fixture.providerFixtureId, fixture);
      const existingFixture = existing.find((candidate) => candidate.providerFixtureId === fixture.providerFixtureId);
      const fixtureData = { ...fixture, isTestFixture: false, lastSyncedAt: now };
      const updateData = existingFixture?.resultStatus === "RESULT_MANUAL"
        ? Object.fromEntries(Object.entries(fixtureData).filter(([key]) => !["homeScoreHt", "awayScoreHt", "homeScoreFt", "awayScoreFt"].includes(key)))
        : fixtureData;
      await prisma.footballFixture.upsert({
        where: { providerFixtureId: fixture.providerFixtureId },
        create: fixtureData,
        update: updateData,
      });
    }
  }

  const latestFixtures = Array.from(latestById.values());
  const trackedRows = await prisma.footballLiveTracking.findMany({
    where: {
      fixture: { providerLeagueId: job.leagueId },
      isEnabled: true,
      status: { in: ["SCHEDULED", "RECORDING", "INTERRUPTED"] },
    },
    include: { fixture: true },
  });
  for (const tracking of trackedRows) {
    const current = latestById.get(tracking.fixture.providerFixtureId);
    if (!current) continue;
    await transitionTrackingFromFixture(tracking.id, current as typeof tracking.fixture & {
      homeScoreHt: number | null; awayScoreHt: number | null; homeScoreFt: number | null; awayScoreFt: number | null;
      elapsedExtraTime: number;
    });
  }
  await capturePrematchOdds(trackedRows, now);
  const oddsCandidateIds = new Set([
    ...trackedRows.filter((tracking) => isLiveFixtureStatus(latestById.get(tracking.fixture.providerFixtureId)?.status ?? tracking.fixture.status))
      .map((tracking) => tracking.fixture.providerFixtureId),
  ]);

  if (oddsCandidateIds.size > 0) {
    const quota = await getQuotaOverview(now);
    const configuredOddsIntervalSeconds = Math.max(60, collectorSettings.oddsIntervalMinutes * 60);
    const adaptiveOddsInterval = quota.oddsRemaining <= 10 || quota.remaining <= 15
      ? Math.max(configuredOddsIntervalSeconds, 900)
      : configuredOddsIntervalSeconds;
    const oddsEndpoint = `/odds/live?league=${job.leagueId}`;
    const lastOddsRequest = await prisma.footballApiRequestLog.findFirst({
      where: { endpoint: oddsEndpoint },
      orderBy: { requestedAt: "desc" },
      select: { requestedAt: true },
    });
    const shouldPollOdds = !lastOddsRequest ||
      now.getTime() - lastOddsRequest.requestedAt.getTime() >= adaptiveOddsInterval * 1000;
    if (shouldPollOdds && quota.oddsRemaining > 0 && quota.remaining > 0) {
      const oddsPayload = await apiFootballClient.get(
        "/odds/live",
        { league: job.leagueId },
        { type: "ODDS" },
      ) as { response: unknown[] };
      const oddsByFixture = new Map<number, unknown>();
      for (const item of oddsPayload.response) {
        const fixtureId = oddsFixtureId(item) ?? providerFixture(item)?.providerFixtureId;
        if (!fixtureId || !oddsCandidateIds.has(fixtureId)) continue;
        oddsByFixture.set(fixtureId, item);
      }
      for (const tracking of trackedRows) {
        const state = await prisma.footballFixture.findUnique({ where: { id: tracking.fixtureId } });
        if (!state || !isLiveFixtureStatus(state.status)) continue;
        const due = dueLiveSlot(state.status, state.elapsedMinute, state.elapsedExtraTime, collectorSettings.oddsIntervalMinutes);
        if (!due) continue;
        const existingSlot = await prisma.footballOddsSnapshot.findFirst({
          where: { trackingId: tracking.id, slotKey: due.slotKey }, select: { id: true, dataStatus: true },
        });
        if (existingSlot && existingSlot.dataStatus !== "MISSING") continue;
        const oddsItem = await getLiveOddsForFixture(state.providerFixtureId, oddsByFixture, adaptiveOddsInterval);
        await captureTrackedOdds({
          trackingId: tracking.id,
          fixture: {
            id: state.id, providerFixtureId: state.providerFixtureId, status: state.status,
            elapsedMinute: state.elapsedMinute, elapsedExtraTime: state.elapsedExtraTime,
            homeScore: state.homeScore, awayScore: state.awayScore,
            homeTeamId: state.homeTeamId, awayTeamId: state.awayTeamId,
            homeScoreHt: state.homeScoreHt, awayScoreHt: state.awayScoreHt,
            homeScoreFt: state.homeScoreFt, awayScoreFt: state.awayScoreFt,
            homeTeamName: state.homeTeamName, awayTeamName: state.awayTeamName,
          },
          raw: { get: "/odds/live", response: oddsItem ? [oddsItem] : [] },
          isTest: state.isTestFixture,
          ...due,
        });
      }
    }
  }

  const hasLive = trackedRows.some((tracking) => isLiveFixtureStatus(latestById.get(tracking.fixture.providerFixtureId)?.status ?? tracking.fixture.status));
  const needsFrequentStatusSync = trackedRows.some((tracking) => {
    const currentStatus = latestById.get(tracking.fixture.providerFixtureId)?.status ?? tracking.fixture.status;
    const kickoffAt = tracking.fixture.kickoffAt.getTime();
    const kickoffIsNear = kickoffAt >= now.getTime() - 4 * 60 * 60 * 1000 && kickoffAt <= now.getTime() + 15 * 60 * 1000;
    return isLiveFixtureStatus(currentStatus)
      || tracking.status === "RECORDING"
      || tracking.status === "INTERRUPTED"
      || (tracking.status === "SCHEDULED" && kickoffIsNear);
  });
  const remainingQuota = await getQuotaOverview(now);
  const configuredOddsIntervalSeconds = Math.max(60, collectorSettings.oddsIntervalMinutes * 60);
  const nextDelaySeconds = needsFrequentStatusSync
    ? statusIntervalSeconds
    : remainingQuota.oddsRemaining <= 10 || remainingQuota.remaining <= 15
      ? Math.max(configuredOddsIntervalSeconds, 900)
      : configuredOddsIntervalSeconds;
  const nextRunAt = new Date(Date.now() + nextDelaySeconds * 1000);
  await updateJob(job.id, {
    status: hasLive ? "LIVE" : "WATCHING",
    lastRunAt: now,
    lastSuccessAt: now,
    nextRunAt,
    lastError: null,
  });
  return { delayMs: nextDelaySeconds * 1000, hasLive };
}

async function runCycle(jobId: string) {
  const job = await prisma.footballCollectorJob.findUnique({ where: { id: jobId } });
  if (!job) return MAX_IDLE_RECHECK_MS;
  const activeTrackingCount = await prisma.footballLiveTracking.count({
    where: { isEnabled: true, status: { in: ["SCHEDULED", "RECORDING", "INTERRUPTED"] }, fixture: { providerLeagueId: job.leagueId } },
  });
  if (!job.enabled && activeTrackingCount === 0) {
    await updateJob(job.id, { status: "DISABLED", nextRunAt: null, lastError: null });
    return MAX_IDLE_RECHECK_MS;
  }

  const settings = await prisma.footballCollectorSettings.upsert({
    where: { id: "default" }, update: {}, create: {
      id: "default",
      isEnabled: FOOTBALL_DEFAULTS.collectorEnabled,
      oddsIntervalMinutes: FOOTBALL_DEFAULTS.oddsIntervalMinutes,
      fixtureSyncIntervalHours: FOOTBALL_DEFAULTS.fixtureSyncIntervalHours,
      statusCheckIntervalSeconds: FOOTBALL_DEFAULTS.statusCheckIntervalSeconds,
    },
  });
  if (!settings.isEnabled) {
    await updateJob(job.id, { status: "PAUSED", lastRunAt: new Date(), nextRunAt: new Date(Date.now() + MAX_IDLE_RECHECK_MS) });
    return MAX_IDLE_RECHECK_MS;
  }

  const now = new Date();
  const today = getUtcDate(now).getTime();
  const quota = await getQuotaOverview(now);
  if (quota.remaining <= 0) {
    const resetAt = nextUtcReset(now);
    await updateJob(job.id, { status: "QUOTA_PAUSED", nextRunAt: resetAt });
    return Math.min(resetAt.getTime() - Date.now(), MAX_IDLE_RECHECK_MS);
  }

  const lastSyncAt = job.lastFixtureSyncAt?.getTime() ?? 0;
  const fixtureSyncIntervalMs = settings.fixtureSyncIntervalHours * 60 * 60 * 1000;
  if (job.enabled && activeTrackingCount === 0 && now.getTime() - lastSyncAt >= fixtureSyncIntervalMs) {
    await updateJob(job.id, { status: "SYNCING", lastRunAt: now, lastError: null });
    await syncLeagueFixtures(job.leagueId, job.season);
  }

  const nextFixture = await prisma.footballFixture.findFirst({
    where: {
      providerLeagueId: job.leagueId,
      isTestFixture: false,
      status: { notIn: ["FT", "AET", "PEN", "CANC", "PST", "ABD", "AWD", "WO"] },
      kickoffAt: { gt: now },
    },
    orderBy: { kickoffAt: "asc" },
    select: { kickoffAt: true },
  });
  const windowFixture = await prisma.footballFixture.findFirst({
    where: {
      providerLeagueId: job.leagueId,
      isTestFixture: false,
      status: { notIn: ["FT", "AET", "PEN", "CANC", "PST", "ABD", "AWD", "WO"] },
      kickoffAt: {
        gte: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        lte: new Date(now.getTime() + 15 * 60 * 1000),
      },
    },
    select: { id: true },
  });

  if (!windowFixture) {
    if (activeTrackingCount > 0) {
      const result = await pollFixtureWindow(job);
      return result.delayMs;
    }
    const tomorrowSync = new Date(today + 24 * 60 * 60 * 1000);
    const nextCheck = nextFixture
      ? new Date(nextFixture.kickoffAt.getTime() - 15 * 60 * 1000)
      : tomorrowSync;
    const delay = Math.max(30_000, Math.min(MAX_IDLE_RECHECK_MS, nextCheck.getTime() - now.getTime()));
    await updateJob(job.id, {
      status: "WAITING",
      lastRunAt: now,
      lastSuccessAt: now,
      nextRunAt: new Date(now.getTime() + delay),
      lastError: null,
    });
    return delay;
  }

  const result = await pollFixtureWindow(job);
  return result.delayMs;
}

export async function runFootballCollectorWorker() {
  const workerId = `football-${process.pid}-${randomUUID()}`;
  const jobs = await getCollectorJobs();
  const primaryJob = jobs.find((job) => job.leagueId === 39)!;

  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  try {
    while (!stopping) {
      const locked = await acquireOrRenewLease(primaryJob.id, workerId);
      if (!locked) {
        await sleep(15_000);
        continue;
      }

      const currentJobs = await getCollectorJobs();
      await prisma.footballCollectorSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          heartbeatAt: new Date(),
          workerId,
          isEnabled: FOOTBALL_DEFAULTS.collectorEnabled,
          oddsIntervalMinutes: FOOTBALL_DEFAULTS.oddsIntervalMinutes,
          fixtureSyncIntervalHours: FOOTBALL_DEFAULTS.fixtureSyncIntervalHours,
          statusCheckIntervalSeconds: FOOTBALL_DEFAULTS.statusCheckIntervalSeconds,
        },
        update: { heartbeatAt: new Date(), workerId, lastError: null },
      });
      await recoverPersistedTrackingState();
      for (const job of currentJobs) {
        if (stopping) break;
        if (!job.enabled && job.id !== primaryJob.id) {
          const activeTrackingCount = await prisma.footballLiveTracking.count({
            where: { isEnabled: true, status: { in: ["SCHEDULED", "RECORDING", "INTERRUPTED"] }, fixture: { providerLeagueId: job.leagueId } },
          });
          if (activeTrackingCount === 0) continue;
        }
        if (job.enabled && job.nextRunAt && job.nextRunAt.getTime() > Date.now()) continue;

        if (!await acquireOrRenewLease(primaryJob.id, workerId)) {
          stopping = true;
          break;
        }
        const ownsPrimaryLease = job.id === primaryJob.id;
        const ownsJobLease = ownsPrimaryLease || await acquireOrRenewLease(job.id, workerId);
        if (!ownsJobLease) continue;

        try {
          await runCycle(job.id);
        } catch (error) {
          const now = new Date();
          const statusCode = error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number"
            ? error.statusCode
            : null;
          const rateLimited = isProviderRateLimited({ statusCode, message: errorText(error) });
          if (error instanceof QuotaExceededError || rateLimited) {
            const quota = await getQuotaOverview(now);
            const resumeAt = error instanceof QuotaExceededError || quota.remaining <= 0 || quota.providerRemaining === 0
              ? nextUtcReset(now)
              : new Date(Math.floor(now.getTime() / 60_000) * 60_000 + 60_000);
            await updateJob(job.id, {
              status: "QUOTA_PAUSED",
              lastRunAt: now,
              nextRunAt: resumeAt,
              lastError: errorText(error),
            });
          } else {
            const nextRunAt = new Date(now.getTime() + job.pollingIntervalSeconds * 1000);
            await updateJob(job.id, {
              status: "ERROR",
              lastRunAt: now,
              nextRunAt,
              lastError: errorText(error),
            });
          }
          await prisma.footballCollectorLog.create({
            data: {
              level: rateLimited || error instanceof QuotaExceededError ? "WARN" : "ERROR",
              action: rateLimited || error instanceof QuotaExceededError ? "RATE_LIMITED" : "WORKER_JOB_FAILED",
              message: errorText(error).slice(0, 1000),
              details: { jobName: job.jobName, statusCode },
            },
          });
        } finally {
          if (!ownsPrimaryLease) await releaseLease(job.id, workerId);
        }
      }

      await retryOneMissingResult();

      try {
        await processExternalTrackings();
      } catch (error) {
        const message = errorText(error);
        await prisma.footballCollectorSettings.update({
          where: { id: "default" },
          data: { lastError: message },
        });
        await prisma.footballCollectorLog.create({
          data: { level: "ERROR", action: "EXTERNAL_TRACKING_POLL_FAILED", message },
        });
      }

      const refreshedJobs = await getCollectorJobs();
      const now = Date.now();
      const nearestRun = refreshedJobs
        .filter((job) => job.enabled)
        .map((job) => job.nextRunAt?.getTime() ?? now)
        .reduce((nearest, runAt) => Math.min(nearest, runAt), now + MAX_IDLE_RECHECK_MS);
      const delayMs = Math.max(1000, Math.min(MAX_IDLE_RECHECK_MS, nearestRun - now));
      const until = Date.now() + delayMs;
      while (!stopping && Date.now() < until) {
        await sleep(Math.min(HEARTBEAT_MS, until - Date.now()));
        if (stopping) break;
        const renewed = await acquireOrRenewLease(primaryJob.id, workerId);
        if (!renewed) {
          stopping = true;
          break;
        }
      }
    }
  } finally {
    for (const job of await getCollectorJobs()) {
      await releaseLease(job.id, workerId);
    }
    await prisma.$disconnect();
  }
}


