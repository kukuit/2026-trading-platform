import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { normalizeLiveOdds } from "./normalizer";
import { parseStructuredLiveMarkets, type PeriodKey } from "./markets";
import { compactSnapshotHash } from "./snapshot-hash";
import { emptyFixtureStatistics, fetchFixtureCornerResults, fetchFixtureStatistics } from "./statistics";
import { resultStatusFromScores, shouldCaptureSlot, shouldMarkEarlierSlotMissed } from "./collection-rules";
import { settleFixtureOdds } from "./settlement";

type ProviderFixtureState = {
  id: string;
  providerFixtureId: number;
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
};

async function writeLog(trackingId: string, level: string, action: string, message: string, details?: Prisma.InputJsonValue) {
  await prisma.footballCollectorLog.create({ data: { trackingId, level, action, message, details } });
}

export async function transitionTrackingFromFixture(trackingId: string, fixture: ProviderFixtureState) {
  const tracking = await prisma.footballLiveTracking.findUnique({ where: { id: trackingId } });
  if (!tracking || !tracking.isEnabled) return;
  const status = fixture.status.toUpperCase();
  const now = new Date();
  if (["FT", "AET", "PEN"].includes(status)) {
    const resultStatus = resultStatusFromScores(fixture);
    await prisma.$transaction([
      prisma.footballLiveTracking.update({
        where: { id: trackingId },
        data: { status: "COMPLETED", isEnabled: false, completedAt: now, lastPolledAt: now, lastError: null },
      }),
      prisma.footballFixture.update({
        where: { id: fixture.id },
        data: {
          homeScoreHt: fixture.homeScoreHt,
          awayScoreHt: fixture.awayScoreHt,
          homeScoreFt: fixture.homeScoreFt,
          awayScoreFt: fixture.awayScoreFt,
          resultStatus,
          resultSource: "API",
          resultUpdatedAt: now,
        },
      }),
      prisma.footballTrackingSlot.updateMany({
        where: { trackingId, status: "PENDING" }, data: { status: "MISSED", error: "Fixture ended before this slot was captured." },
      }),
    ]);
    try {
      const latestSnapshot = await prisma.footballOddsSnapshot.findFirst({
        where: { trackingId },
        orderBy: { capturedAt: "desc" },
        select: {
          id: true,
          homeCornerKicks: true,
          awayCornerKicks: true,
        },
      });
      const cornerResults = await fetchFixtureCornerResults(fixture.providerFixtureId, {
        homeId: fixture.homeTeamId,
        awayId: fixture.awayTeamId,
        homeName: fixture.homeTeamName,
        awayName: fixture.awayTeamName,
      });
      const cornerResultData = {
        ...(cornerResults.homeCornerKicksHt !== null ? { homeCornerKicksHt: cornerResults.homeCornerKicksHt } : {}),
        ...(cornerResults.awayCornerKicksHt !== null ? { awayCornerKicksHt: cornerResults.awayCornerKicksHt } : {}),
        ...(cornerResults.homeCornerKicksFt !== null ? { homeCornerKicksFt: cornerResults.homeCornerKicksFt } : {}),
        ...(cornerResults.awayCornerKicksFt !== null ? { awayCornerKicksFt: cornerResults.awayCornerKicksFt } : {}),
      };
      if (Object.keys(cornerResultData).length) {
        await prisma.footballFixture.update({ where: { id: fixture.id }, data: cornerResultData });
      }
      if (latestSnapshot) {
        await prisma.footballOddsSnapshot.update({
          where: { id: latestSnapshot.id },
          data: {
            homeCornerKicks: cornerResults.homeCornerKicksFt ?? latestSnapshot.homeCornerKicks,
            awayCornerKicks: cornerResults.awayCornerKicksFt ?? latestSnapshot.awayCornerKicks,
            statisticsCheckedAt: now,
          },
        });
      }
    } catch {
      // Final statistics are supplementary and must not block result completion.
    }
    await settleFixtureOdds(fixture.id);
    await writeLog(trackingId, "INFO", "TRACKING_COMPLETED", `Fixture ${fixture.providerFixtureId} finished; live odds collection stopped.`, {
      resultStatus, homeScoreFt: fixture.homeScoreFt, awayScoreFt: fixture.awayScoreFt,
    });
    return;
  }
  if (["PST", "CANC", "ABD", "AWD", "WO"].includes(status)) {
    await prisma.footballLiveTracking.update({ where: { id: trackingId }, data: { status: "CANCELLED", isEnabled: false, lastPolledAt: now } });
    await writeLog(trackingId, "WARN", "FIXTURE_NOT_PLAYED", `Fixture ${fixture.providerFixtureId} is ${status}; tracking stopped without marking a result.`);
    return;
  }
  const live = ["1H", "HT", "2H", "ET", "P", "INT", "SUSP", "LIVE"].includes(status);
  await prisma.footballLiveTracking.update({
    where: { id: trackingId },
    data: {
      status: live ? "RECORDING" : "SCHEDULED",
      ...(live && !tracking.startedAt ? { startedAt: now } : {}),
      lastPolledAt: now,
      lastError: null,
    },
  });
  if (live && tracking.status !== "RECORDING") {
    await writeLog(trackingId, "INFO", "TRACKING_RECORDING", `Fixture ${fixture.providerFixtureId} entered ${status}; collector started from the current provider minute.`, {
      elapsedMinute: fixture.elapsedMinute, elapsedExtraTime: fixture.elapsedExtraTime,
    });
  }
}

async function markEarlierSlotsMissed(trackingId: string, period: PeriodKey, targetMinute: number) {
  const pending = await prisma.footballTrackingSlot.findMany({
    where: { trackingId, status: "PENDING" },
    select: { id: true, slotKey: true, targetMinute: true, period: true },
  });
  const missed = pending.filter((slot) => shouldMarkEarlierSlotMissed(slot, period, targetMinute));
  if (!missed.length) return 0;
  await prisma.footballTrackingSlot.updateMany({
    where: { id: { in: missed.map((slot) => slot.id) } },
    data: { status: "MISSED", error: "The scheduled minute passed before the worker could capture it; historical odds were not recreated." },
  });
  await writeLog(trackingId, "WARN", "ODDS_SLOTS_MISSED", `${missed.length} earlier odds slot(s) were missed during recovery.`, {
    slots: missed.map((slot) => slot.slotKey),
  });
  return missed.length;
}

export async function markTrackingSlotsMissed(trackingId: string, reason: string) {
  const pending = await prisma.footballTrackingSlot.findMany({ where: { trackingId, status: "PENDING" }, select: { id: true } });
  if (!pending.length) return 0;
  await prisma.footballTrackingSlot.updateMany({
    where: { id: { in: pending.map((slot) => slot.id) } }, data: { status: "MISSED", error: reason },
  });
  await writeLog(trackingId, "WARN", "ODDS_SLOTS_MISSED", `${pending.length} pending odds slot(s) were marked missed.`, { reason, count: pending.length });
  return pending.length;
}

export async function captureTrackedOdds(input: {
  trackingId: string;
  fixture: ProviderFixtureState;
  raw: unknown;
  slotKey: string;
  targetMinute: number;
  actualMinute: number;
  period: PeriodKey | "PREMATCH";
  isTest?: boolean;
  sourceType?: "LIVE" | "PREMATCH";
}) {
  const { trackingId, fixture, raw, slotKey, targetMinute, actualMinute, period, isTest = false, sourceType = "LIVE" } = input;
  if (period !== "PREMATCH") {
    await prisma.footballTrackingSlot.upsert({
      where: { trackingId_slotKey: { trackingId, slotKey } },
      create: { trackingId, slotKey, targetMinute, period, status: "PENDING" },
      update: {},
    });
    await markEarlierSlotsMissed(trackingId, period, targetMinute);
  }
  const existing = await prisma.footballOddsSnapshot.findFirst({ where: { trackingId, slotKey }, select: { id: true, capturedAt: true, dataStatus: true } });
  if (!shouldCaptureSlot(existing)) {
    await prisma.footballTrackingSlot.updateMany({ where: { trackingId, slotKey }, data: { status: existing?.dataStatus === "MISSING" ? "MISSING" : "SAVED" } });
    return { saved: false, duplicate: true, dataStatus: existing?.dataStatus ?? null };
  }

  const normalized = normalizeLiveOdds(raw, fixture.providerFixtureId);
  if (existing && normalized.values.length === 0) {
    return { saved: false, duplicate: true, dataStatus: existing.dataStatus };
  }
  const settings = await prisma.footballCollectorSettings.findUnique({ where: { id: "default" }, select: { preferredBookmakerId: true } });
  const markets = parseStructuredLiveMarkets(normalized.values, { home: fixture.homeTeamName, away: fixture.awayTeamName }, settings?.preferredBookmakerId);
  const capturedAt = new Date();
  let statistics = period === "PREMATCH"
    ? { homeCornerKicks: 0, awayCornerKicks: 0 }
    : emptyFixtureStatistics();
  let statisticsCheckedAt: Date | null = null;
  if (period !== "PREMATCH") {
    const previousStatistics = await prisma.footballOddsSnapshot.findFirst({
      where: { trackingId, statisticsCheckedAt: { not: null } },
      orderBy: { capturedAt: "desc" },
      select: {
        homeCornerKicks: true,
        awayCornerKicks: true,
        statisticsCheckedAt: true,
      },
    });
    if (previousStatistics) {
      statistics = {
        homeCornerKicks: previousStatistics.homeCornerKicks,
        awayCornerKicks: previousStatistics.awayCornerKicks,
      };
      statisticsCheckedAt = previousStatistics.statisticsCheckedAt;
    }

    if (!statisticsCheckedAt || capturedAt.getTime() - statisticsCheckedAt.getTime() >= 5 * 60_000) {
      statisticsCheckedAt = capturedAt;
      try {
        const latest = await fetchFixtureStatistics(fixture.providerFixtureId, {
          homeId: fixture.homeTeamId,
          awayId: fixture.awayTeamId,
          homeName: fixture.homeTeamName,
          awayName: fixture.awayTeamName,
        });
        statistics = {
          homeCornerKicks: latest.homeCornerKicks ?? statistics.homeCornerKicks,
          awayCornerKicks: latest.awayCornerKicks ?? statistics.awayCornerKicks,
        };
      } catch {
        // Statistics are supplementary; a stats/quota failure must not block odds capture.
      }
    }
  }
  const sourceHash = compactSnapshotHash({
    fixtureId: fixture.id,
    sourceType,
    isTest,
    slotKey,
    targetMinute,
    actualMinute,
    period,
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    homeCornerKicks: statistics.homeCornerKicks,
    awayCornerKicks: statistics.awayCornerKicks,
    fixtureStatus: fixture.status,
    markets,
  });
  try {
    const snapshot = await prisma.$transaction(async (transaction) => {
      await transaction.footballFixture.update({ where: { id: fixture.id }, data: { lastSyncedAt: capturedAt } });
      const snapshotData = {
        fixtureId: fixture.id,
        trackingId,
        slotKey,
        targetMinute,
        actualMinute,
        period,
        capturedAt,
        homeScore: fixture.homeScore,
        awayScore: fixture.awayScore,
        ...statistics,
        statisticsCheckedAt,
        fixtureStatus: fixture.status,
        dataStatus: markets.dataStatus,
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
        sourceHash,
        sourceType,
        isTest,
      };
      const created = existing
        ? await transaction.footballOddsSnapshot.update({
          where: { id: existing.id },
          data: snapshotData,
        })
        : await transaction.footballOddsSnapshot.create({
          data: snapshotData,
        });
      await transaction.footballTrackingSlot.updateMany({
        where: { trackingId, slotKey },
        data: { status: markets.dataStatus === "MISSING" ? "MISSING" : "SAVED", actualMinute, capturedAt, error: null },
      });
      await transaction.footballLiveTracking.update({
        where: { id: trackingId },
        data: { lastPolledAt: capturedAt, lastSavedMinute: actualMinute, lastError: null },
      });
      return created;
    }, { isolationLevel: "Serializable" });
    await writeLog(trackingId, markets.dataStatus === "MISSING" ? "WARN" : "INFO", existing ? "ODDS_SLOT_REPAIRED" : "ODDS_SLOT_CAPTURED", `${slotKey} ${existing ? "repaired" : "saved"} at ${sourceType === "PREMATCH" ? "pre-match" : `provider minute ${actualMinute}`} (${markets.dataStatus}).`, {
      snapshotId: snapshot.id, targetMinute, actualMinute, period, sourceType, missingMarkets: markets.missingMarkets,
      bookmakerId: markets.bookmakerId, bookmakerName: markets.bookmakerName,
    });
    return { saved: true, duplicate: false, snapshotId: snapshot.id, dataStatus: markets.dataStatus };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingSlot = await prisma.footballOddsSnapshot.findFirst({ where: { trackingId, slotKey }, select: { dataStatus: true } });
      return { saved: false, duplicate: true, dataStatus: existingSlot?.dataStatus ?? null };
    }
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Could not persist live odds snapshot.";
    await prisma.footballTrackingSlot.updateMany({ where: { trackingId, slotKey, status: "PENDING" }, data: { error: message } });
    await prisma.footballLiveTracking.update({ where: { id: trackingId }, data: { lastError: message } });
    await writeLog(trackingId, "ERROR", "ODDS_SLOT_SAVE_FAILED", message, { targetMinute, actualMinute, slotKey });
    throw error;
  }
}

