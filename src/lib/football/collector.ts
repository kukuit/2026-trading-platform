import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { normalizeLiveOdds } from "./normalizer";
import { parseStructuredLiveMarkets, type PeriodKey } from "./markets";
import { resultStatusFromScores, shouldCaptureSlot, shouldMarkEarlierSlotMissed } from "./collection-rules";

type ProviderFixtureState = {
  id: string;
  providerFixtureId: number;
  status: string;
  elapsedMinute: number | null;
  elapsedExtraTime: number;
  homeScore: number | null;
  awayScore: number | null;
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
  period: PeriodKey;
  isTest?: boolean;
}) {
  const { trackingId, fixture, raw, slotKey, targetMinute, actualMinute, period, isTest = false } = input;
  await markEarlierSlotsMissed(trackingId, period, targetMinute);
  const existing = await prisma.footballOddsSnapshot.findFirst({ where: { trackingId, slotKey }, select: { id: true, capturedAt: true, dataStatus: true } });
  if (!shouldCaptureSlot(existing)) {
    await prisma.footballTrackingSlot.updateMany({ where: { trackingId, slotKey }, data: { status: existing.dataStatus === "MISSING" ? "MISSING" : "SAVED" } });
    return { saved: false, duplicate: true, dataStatus: existing.dataStatus };
  }

  const normalized = normalizeLiveOdds(raw, fixture.providerFixtureId);
  const settings = await prisma.footballCollectorSettings.findUnique({ where: { id: "default" }, select: { preferredBookmakerId: true } });
  const markets = parseStructuredLiveMarkets(normalized.values, { home: fixture.homeTeamName, away: fixture.awayTeamName }, settings?.preferredBookmakerId);
  const capturedAt = new Date();
  const rawJson = JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue;
  try {
    const snapshot = await prisma.$transaction(async (transaction) => {
      await transaction.footballFixture.update({ where: { id: fixture.id }, data: { lastSyncedAt: capturedAt } });
      const created = await transaction.footballOddsSnapshot.create({
        data: {
          fixtureId: fixture.id,
          trackingId,
          slotKey,
          targetMinute,
          actualMinute,
          period,
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          fixtureStatus: fixture.status,
          dataStatus: markets.dataStatus,
          bookmakerId: markets.bookmakerId,
          bookmakerName: markets.bookmakerName,
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
          missingMarkets: markets.missingMarkets as Prisma.InputJsonValue,
          providerUpdatedAt: normalized.providerUpdatedAt,
          sourceHash: normalized.sourceHash,
          sourceType: "LIVE",
          isTest,
          rawJson,
          values: {
            create: normalized.values.map((value) => ({
              providerBetId: value.providerBetId,
              betName: value.betName,
              bookmakerId: value.bookmakerId,
              bookmakerName: value.bookmakerName,
              selectionName: value.selectionName,
              oddValue: value.oddValue,
              oddNumeric: value.oddNumeric,
              main: value.main,
              suspended: value.suspended,
              blocked: value.blocked,
              stopped: value.stopped,
              finished: value.finished,
              extraData: Object.keys(value.extraData).length ? value.extraData as Prisma.InputJsonObject : undefined,
            })),
          },
        },
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
    await writeLog(trackingId, markets.dataStatus === "MISSING" ? "WARN" : "INFO", "ODDS_SLOT_CAPTURED", `${slotKey} saved at provider minute ${actualMinute} (${markets.dataStatus}).`, {
      snapshotId: snapshot.id, targetMinute, actualMinute, period, missingMarkets: markets.missingMarkets,
      bookmakerId: markets.bookmakerId, bookmakerName: markets.bookmakerName,
    });
    return { saved: true, duplicate: false, snapshotId: snapshot.id, dataStatus: markets.dataStatus, valueCount: normalized.values.length };
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

