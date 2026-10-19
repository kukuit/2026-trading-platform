import assert from "node:assert/strict";
import test from "node:test";
import {
  isProviderRateLimited,
  providerMinuteQuotaExhausted,
  resultStatusFromScores,
  shouldCaptureSlot,
  shouldMarkEarlierSlotMissed,
  shouldPauseForQuota,
} from "../../.football-worker-build/src/lib/football/collection-rules.js";

test("slot snapshots are captured once and an existing snapshot is a duplicate", () => {
  assert.equal(shouldCaptureSlot(null), true);
  assert.equal(shouldCaptureSlot(undefined), true);
  assert.equal(shouldCaptureSlot({ id: "snapshot-1" }), false);
});

test("restart recovery marks passed slots missed but keeps current and future slots pending", () => {
  assert.equal(shouldMarkEarlierSlotMissed({ period: "1H", targetMinute: 15 }, "1H", 20), true);
  assert.equal(shouldMarkEarlierSlotMissed({ period: "1H", targetMinute: 20 }, "1H", 20), false);
  assert.equal(shouldMarkEarlierSlotMissed({ period: "1H", targetMinute: 45 }, "2H", 50), true);
  assert.equal(shouldMarkEarlierSlotMissed({ period: "2H", targetMinute: 55 }, "2H", 50), false);
  assert.equal(shouldMarkEarlierSlotMissed({ period: "ET", targetMinute: 95 }, "2H", 90), false);
});

test("missing half or full time score remains a missing result", () => {
  assert.equal(resultStatusFromScores({ homeScoreHt: 1, awayScoreHt: 0, homeScoreFt: 2, awayScoreFt: 1 }), "RESULT_COMPLETE");
  assert.equal(resultStatusFromScores({ homeScoreHt: 1, awayScoreHt: null, homeScoreFt: 2, awayScoreFt: 1 }), "RESULT_MISSING");
});

test("rate limit response and fresh zero per-minute quota stop lower priority requests", () => {
  assert.equal(isProviderRateLimited({ statusCode: 429 }), true);
  assert.equal(isProviderRateLimited({ message: "daily quota exhausted" }), true);
  assert.equal(isProviderRateLimited({ statusCode: 503, message: "server error" }), false);
  const now = new Date("2026-10-15T12:34:45.000Z");
  assert.equal(providerMinuteQuotaExhausted({ remaining: 0, reportedAt: new Date("2026-10-15T12:34:02.000Z"), now }), true);
  assert.equal(providerMinuteQuotaExhausted({ remaining: 0, reportedAt: new Date("2026-10-15T12:33:59.000Z"), now }), false);
  assert.equal(shouldPauseForQuota({ remaining: 10, oddsRemaining: 0, reservedRemaining: 2, recordingCount: 1, waitingCount: 0, missingResultsCount: 0 }), true);
  assert.equal(shouldPauseForQuota({ remaining: 10, oddsRemaining: 0, reservedRemaining: 2, recordingCount: 0, waitingCount: 0, missingResultsCount: 0 }), false);
});
