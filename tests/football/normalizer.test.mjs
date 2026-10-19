import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLiveOdds, stableStringify } from "../../.football-worker-build/src/lib/football/normalizer.js";

function directMarket(odd, flags = {}) {
  return {
    get: "odds/live",
    errors: [],
    response: [{
      fixture: { id: 12345 },
      update: "2026-10-12T12:00:00Z",
      blocked: flags.blocked ?? false,
      stopped: flags.stopped ?? false,
      finished: flags.finished ?? false,
      odds: [{
        id: 1,
        name: "Match Winner",
        values: [{ value: "Home", odd, main: true, handicap: null, ...(flags.suspended === undefined ? {} : { suspended: flags.suspended }) }],
      }],
    }],
  };
}

test("normalizes direct live markets and preserves absent bookmaker metadata", () => {
  const result = normalizeLiveOdds(directMarket("1.85"));
  assert.equal(result.fixtureId, 12345);
  assert.equal(result.values.length, 1);
  assert.equal(result.values[0].providerBetId, 1);
  assert.equal(result.values[0].betName, "Match Winner");
  assert.equal(result.values[0].bookmakerId, null);
  assert.equal(result.values[0].bookmakerName, null);
  assert.equal(result.values[0].selectionName, "Home");
  assert.equal(result.values[0].oddNumeric, "1.85");
  assert.equal(result.values[0].main, true);
  assert.equal(result.providerUpdatedAt.toISOString(), "2026-10-12T12:00:00.000Z");
});

test("normalizes bookmaker, bet and market status fields", () => {
  const raw = {
    response: [{
      fixture: { id: 42 },
      stopped: true,
      bookmakers: [{
        id: 8,
        name: "Example Bookmaker",
        bets: [{
          id: 5,
          name: "Over/Under",
          values: [{ value: "Over 2.5", odd: "2.1", suspended: true, main: false }],
        }],
      }],
    }],
  };
  const [value] = normalizeLiveOdds(raw).values;
  assert.equal(value.bookmakerId, 8);
  assert.equal(value.bookmakerName, "Example Bookmaker");
  assert.equal(value.stopped, true);
  assert.equal(value.suspended, true);
  assert.equal(value.main, false);
});

test("hash ignores object key order but changes for odds or status updates", () => {
  const a = normalizeLiveOdds(directMarket("1.85"));
  const b = normalizeLiveOdds(directMarket("1.90"));
  const aAgain = normalizeLiveOdds(directMarket("1.85"));
  const stopped = normalizeLiveOdds(directMarket("1.85", { stopped: true }));

  assert.equal(a.sourceHash, aAgain.sourceHash);
  assert.notEqual(a.sourceHash, b.sourceHash);
  assert.notEqual(a.sourceHash, stopped.sourceHash);
  assert.equal(stableStringify({ b: 2, a: 1 }), stableStringify({ a: 1, b: 2 }));
});

test("empty live odds response remains an empty result, not a parsing failure", () => {
  const result = normalizeLiveOdds({ get: "odds/live", errors: [], results: 0, response: [] }, 777);
  assert.equal(result.fixtureId, 777);
  assert.deepEqual(result.values, []);
  assert.equal(result.sourceHash.length, 64);
});
