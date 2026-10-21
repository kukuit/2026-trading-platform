import type { PeriodKey } from "./markets";

const PERIOD_RANK: Record<string, number> = { "1H": 1, "2H": 2, ET: 3 };

export function shouldCaptureSlot(existingSnapshot: unknown) {
  if (existingSnapshot === null || existingSnapshot === undefined) return true;
  return typeof existingSnapshot === "object" && "dataStatus" in existingSnapshot &&
    (existingSnapshot as { dataStatus?: unknown }).dataStatus === "MISSING";
}

export function shouldMarkEarlierSlotMissed(
  slot: { period: string | null; targetMinute: number | null },
  currentPeriod: PeriodKey,
  currentTargetMinute: number,
) {
  const slotRank = slot.period ? PERIOD_RANK[slot.period] : undefined;
  const currentRank = PERIOD_RANK[currentPeriod];
  return slotRank !== undefined && (
    slotRank < currentRank ||
    (slotRank === currentRank && slot.targetMinute !== null && slot.targetMinute < currentTargetMinute)
  );
}

export function resultStatusFromScores(scores: {
  homeScoreHt: number | null;
  awayScoreHt: number | null;
  homeScoreFt: number | null;
  awayScoreFt: number | null;
}) {
  return scores.homeScoreHt !== null && scores.awayScoreHt !== null &&
    scores.homeScoreFt !== null && scores.awayScoreFt !== null
    ? "RESULT_COMPLETE" as const
    : "RESULT_MISSING" as const;
}

export function isProviderRateLimited(input: { statusCode?: number | null; message?: string | null }) {
  return input.statusCode === 429 || /quota|rate.?limit/i.test(input.message ?? "");
}

export function providerMinuteQuotaExhausted(input: {
  remaining: number | null;
  reportedAt: Date | null;
  now: Date;
}) {
  if (input.remaining !== 0 || !input.reportedAt) return false;
  const currentMinute = Math.floor(input.now.getTime() / 60_000) * 60_000;
  return input.reportedAt.getTime() >= currentMinute;
}

export function shouldPauseForQuota(input: {
  remaining: number;
  oddsRemaining: number;
  reservedRemaining: number;
  recordingCount: number;
  waitingCount: number;
  missingResultsCount: number;
}) {
  return input.remaining <= 0 ||
    ((input.recordingCount > 0 || input.waitingCount > 0) && (input.oddsRemaining <= 0 || input.reservedRemaining <= 0)) ||
    (input.missingResultsCount > 0 && input.reservedRemaining <= 0);
}
