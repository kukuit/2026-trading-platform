import assert from "node:assert/strict";
import test from "node:test";
import { classifyLiveMarket, dueLiveSlot, parseStructuredLiveMarkets } from "../../.football-worker-build/src/lib/football/markets.js";
import { normalizeLiveOdds } from "../../.football-worker-build/src/lib/football/normalizer.js";

function market(name, values) {
  return { id: 999, name, values };
}

function selection(value, odd, handicap, main) {
  return { value, odd, handicap, ...(main === undefined ? {} : { main }) };
}

function normalizedMarkets() {
  const raw = {
    response: [{
      fixture: { id: 123 },
      bookmakers: [
        { id: 7, name: "Primary", bets: [
          market("Asian Handicap - 1st Half", [selection("Arsenal", "1.91", "-0.25"), selection("Aston Villa", "1.95", "+0.25")]),
          market("Asian Handicap - Full Time", [selection("Arsenal", "1.87", "-0.75"), selection("Aston Villa", "2.01", "+0.75")]),
          market("Goals Over/Under - 1st Half", [selection("Over 1.5", "1.80"), selection("Under 1.5", "2.00")]),
          market("Goals Over/Under - Full Time", [selection("Over 2.5", "1.82"), selection("Under 2.5", "1.98")]),
        ] },
        { id: 8, name: "Secondary", bets: [
          market("Asian Handicap - 1st Half", [selection("Arsenal", "9.99", "-9.5")]),
        ] },
      ],
    }],
  };
  return normalizeLiveOdds(raw).values;
}

test("maps live market names to distinct HT and FT columns", () => {
  assert.equal(classifyLiveMarket("Asian Handicap - 1st Half"), "AH_HT");
  assert.equal(classifyLiveMarket("Asian Handicap - Full Time"), "AH_FT");
  assert.equal(classifyLiveMarket("Goals Over/Under - 1st Half"), "OU_HT");
  assert.equal(classifyLiveMarket("Goals Over/Under - Full Time"), "OU_FT");
  assert.equal(classifyLiveMarket("Match Winner"), null);
});

test("parses AH line sign and both side prices from the same bookmaker", () => {
  const result = parseStructuredLiveMarkets(normalizedMarkets(), { home: "Arsenal", away: "Aston Villa" });
  assert.equal(result.bookmakerId, 7);
  assert.equal(result.bookmakerName, "Primary");
  assert.equal(result.ahHtLine, "-0.25");
  assert.equal(result.ahHtHomePrice, "1.91");
  assert.equal(result.ahHtAwayPrice, "1.95");
  assert.equal(result.ahFtLine, "-0.75");
  assert.equal(result.ahFtHomePrice, "1.87");
  assert.equal(result.ahFtAwayPrice, "2.01");
  assert.equal(result.ouHtLine, "1.5");
  assert.equal(result.ouFtLine, "2.5");
  assert.deepEqual(result.missingMarkets, []);
  assert.equal(result.dataStatus, "COMPLETE");
});

test("uses the provider main OU pair and keeps both prices on the same line", () => {
  const values = normalizeLiveOdds({ response: [{
    bookmakers: [{ id: 7, name: "Primary", bets: [market("Over/Under Line", [
      selection("Over", "2.125", "3.0", true),
      selection("Over", "2.25", "3.25"),
      selection("Under", "1.75", "3.0", true),
      selection("Under", "1.65", "3.25"),
    ])] }],
  }] }).values;
  const result = parseStructuredLiveMarkets(values, { home: "Home", away: "Away" });
  assert.equal(result.ouFtLine, "3");
  assert.equal(result.ouFtOverPrice, "2.125");
  assert.equal(result.ouFtUnderPrice, "1.75");
});

test("derives the home AH sign only from an away line when the home line is absent", () => {
  const values = normalizeLiveOdds({ response: [{
    bookmakers: [{ id: 4, name: "Source", bets: [market("Asian Handicap - 1st Half", [selection("Away", "2.0", "+0.5")])] }],
  }] }).values;
  const result = parseStructuredLiveMarkets(values, { home: "Home", away: "Away" });
  assert.equal(result.ahHtLine, "-0.5");
  assert.equal(result.ahHtHomePrice, null);
  assert.equal(result.ahHtAwayPrice, "2");
  assert.equal(result.dataStatus, "PARTIAL");
});

test("uses provider elapsed minute for target and actual minute and pauses at halftime", () => {
  assert.deepEqual(dueLiveSlot("1H", 11), { slotKey: "1H_10", period: "1H", targetMinute: 10, actualMinute: 11 });
  assert.deepEqual(dueLiveSlot("2H", 52), { slotKey: "2H_50", period: "2H", targetMinute: 50, actualMinute: 52 });
  assert.equal(dueLiveSlot("HT", 45), null);
  assert.equal(dueLiveSlot("FT", 90), null);
});
