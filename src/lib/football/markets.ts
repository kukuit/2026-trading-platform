import type { NormalizedOddsValue } from "./normalizer";

export type MarketKey =
  | "AH_HT" | "AH_FT" | "OU_HT" | "OU_FT"
  | "CORNER_AH_HT" | "CORNER_AH_FT" | "CORNER_OU_HT" | "CORNER_OU_FT";
export type PeriodKey = "1H" | "2H" | "ET";

export const PREMATCH_MINUTES = 10;
export const PREMATCH_SLOT_KEY = `PREMATCH_${PREMATCH_MINUTES}`;

type HandicapSnapshotValues = {
  sourceType?: string | null;
  period?: string | null;
  fixtureStatus?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  homeCornerKicks?: number | null;
  awayCornerKicks?: number | null;
  ahHtLine?: unknown;
  ahFtLine?: unknown;
  cornerAhHtLine?: unknown;
  cornerAhFtLine?: unknown;
};

function withoutCurrentMargin(line: unknown, margin: number | null) {
  if (line === null || line === undefined) return null;
  const value = Number(line);
  if (!Number.isFinite(value)) return String(line);
  const adjusted = value + (margin ?? 0);
  return String(Number(adjusted.toFixed(4)));
}

/** Re-express live full-time handicap lines for the play remaining after this snapshot. */
export function displayHandicapLines(snapshot: HandicapSnapshotValues) {
  const live = snapshot.sourceType === "LIVE";
  const firstHalfOpen = snapshot.period?.toUpperCase() === "1H" ||
    (snapshot.period == null && snapshot.fixtureStatus?.toUpperCase() === "1H");
  const goalMargin = live && snapshot.homeScore !== null && snapshot.homeScore !== undefined &&
    snapshot.awayScore !== null && snapshot.awayScore !== undefined
    ? snapshot.homeScore - snapshot.awayScore
    : null;
  const cornerMargin = live && snapshot.homeCornerKicks !== null && snapshot.homeCornerKicks !== undefined &&
    snapshot.awayCornerKicks !== null && snapshot.awayCornerKicks !== undefined
    ? snapshot.homeCornerKicks - snapshot.awayCornerKicks
    : null;

  return {
    ahHtLine: withoutCurrentMargin(snapshot.ahHtLine, firstHalfOpen ? goalMargin : null),
    ahFtLine: withoutCurrentMargin(snapshot.ahFtLine, goalMargin),
    cornerAhHtLine: withoutCurrentMargin(snapshot.cornerAhHtLine, firstHalfOpen ? cornerMargin : null),
    cornerAhFtLine: withoutCurrentMargin(snapshot.cornerAhFtLine, cornerMargin),
  };
}

export type StructuredMarkets = {
  bookmakerId: number | null;
  bookmakerName: string | null;
  ahHtLine: string | null;
  ahHtHomePrice: string | null;
  ahHtAwayPrice: string | null;
  ahFtLine: string | null;
  ahFtHomePrice: string | null;
  ahFtAwayPrice: string | null;
  ouHtLine: string | null;
  ouHtOverPrice: string | null;
  ouHtUnderPrice: string | null;
  ouFtLine: string | null;
  ouFtOverPrice: string | null;
  ouFtUnderPrice: string | null;
  cornerAhHtLine: string | null;
  cornerAhHtHomePrice: string | null;
  cornerAhHtAwayPrice: string | null;
  cornerOuHtLine: string | null;
  cornerOuHtOverPrice: string | null;
  cornerOuHtUnderPrice: string | null;
  cornerAhFtLine: string | null;
  cornerAhFtHomePrice: string | null;
  cornerAhFtAwayPrice: string | null;
  cornerOuFtLine: string | null;
  cornerOuFtOverPrice: string | null;
  cornerOuFtUnderPrice: string | null;
  missingMarkets: string[];
  dataStatus: "COMPLETE" | "PARTIAL" | "MISSING";
};

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function periodFromMarket(name: string): "HT" | "FT" | null {
  const text = normalized(name).replace(/[^a-z0-9]+/g, " ").trim();
  if (/\b(first half|1st half|half time|1h|h1|ht)\b/.test(text)) return "HT";
  if (/\b(full time|match|ft|regular time)\b/.test(text)) return "FT";
  return null;
}

export function classifyLiveMarket(betName: string): MarketKey | null {
  const text = normalized(betName);
  const isCornerMarket = /\bcorners?\b/.test(text);
  if (isCornerMarket) {
    if (/\b(second half|2nd half|2h|h2)\b/.test(text)) return null;
    if (/\beuropean\s+handicap\b|\b(?:3\s*way|three\s*way|threeway)\b/.test(text)) return null;
    const period = periodFromMarket(text) ?? "FT";
    if (/\bhandicap\b/.test(text)) return period === "HT" ? "CORNER_AH_HT" : "CORNER_AH_FT";
    if (/\basian\s+corners?\b|over\s*\/\s*under|over under|\btotal\b|\btotals\b/.test(text)) {
      return period === "HT" ? "CORNER_OU_HT" : "CORNER_OU_FT";
    }
    return null;
  }
  // Only map the main match and first-half goal markets into structured odds.
  // Card, player, and second-half markets stay out of the compact snapshot.
  if (/\b(corners?|cards?|yellow|red|shots?|shot\s*on\s*target|fouls?|offsides?|player|scorer)\b/.test(text) ||
    /\beuropean\s+handicap\b/.test(text) ||
    /\b(?:3\s*way|three\s*way|threeway)\b/.test(text) ||
    /\b(second half|2nd half|2h|h2|\d{1,2}\s*m\s*-\s*\d{1,2}\s*m)\b/.test(text)) return null;
  const period = periodFromMarket(text) ?? "FT";
  // Require an explicitly Asian, two-way market. Generic/European handicap
  // markets may include a draw selection; pairing only Home and Away would
  // silently publish European prices as Asian handicap odds.
  if (/\basian\s+handicap\b/.test(text)) return period === "HT" ? "AH_HT" : "AH_FT";
  if (/over\s*\/\s*under|over under|total goals|goals over under|goal line|\btotals?\b/.test(text)) return period === "HT" ? "OU_HT" : "OU_FT";
  return null;
}

function lineFromValue(value: NormalizedOddsValue): number | null {
  const extras = value.extraData;
  const candidates = [extras.handicap, extras.line, extras.total, value.selectionName];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "string") {
      const match = candidate.match(/[+-]?\d+(?:\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return null;
}

function selectionSide(value: NormalizedOddsValue, homeTeam: string, awayTeam: string): "HOME" | "AWAY" | null {
  const text = normalized(value.selectionName.trim());
  const home = normalized(homeTeam.trim());
  const away = normalized(awayTeam.trim());
  if (/^(home|1|team 1)(?:\s|$)/.test(text) || text.startsWith(`${home} `) || text === home) return "HOME";
  if (/^(away|2|team 2)(?:\s|$)/.test(text) || text.startsWith(`${away} `) || text === away) return "AWAY";
  return null;
}

function overUnderSide(value: NormalizedOddsValue): "OVER" | "UNDER" | null {
  const text = normalized(value.selectionName.trim());
  if (/^over\b/.test(text) || text.startsWith("o ")) return "OVER";
  if (/^under\b/.test(text) || text.startsWith("u ")) return "UNDER";
  return null;
}

function decimal(value: number | null) {
  return value === null ? null : String(value);
}

function usableOdds(value: NormalizedOddsValue) {
  return value.oddNumeric !== null && Number(value.oddNumeric) > 1 &&
    value.suspended !== true && value.blocked !== true &&
    value.stopped !== true && value.finished !== true;
}

/**
 * Classifies provider market names and keeps structured fields on one bookmaker.
 * Unrecognized/ambiguous market names stay in the raw/value tables and never
 * get guessed into HT or FT columns.
 */
export function parseStructuredLiveMarkets(
  values: NormalizedOddsValue[],
  teams: { home: string; away: string },
  preferredBookmakerId?: number | null,
): StructuredMarkets {
  const bookmakerIds = Array.from(new Set(values.map((value) => value.bookmakerId).filter((id): id is number => id !== null)));
  const bookmakerId = preferredBookmakerId !== null && preferredBookmakerId !== undefined && bookmakerIds.includes(preferredBookmakerId)
    ? preferredBookmakerId
    : bookmakerIds[0] ?? null;
  const selected = values.filter((value) => bookmakerId === null ? value.bookmakerId === null : value.bookmakerId === bookmakerId);
  const result: StructuredMarkets = {
    bookmakerId,
    bookmakerName: selected.find((value) => value.bookmakerName)?.bookmakerName ?? null,
    ahHtLine: null, ahHtHomePrice: null, ahHtAwayPrice: null,
    ahFtLine: null, ahFtHomePrice: null, ahFtAwayPrice: null,
    ouHtLine: null, ouHtOverPrice: null, ouHtUnderPrice: null,
    ouFtLine: null, ouFtOverPrice: null, ouFtUnderPrice: null,
    cornerAhHtLine: null, cornerAhHtHomePrice: null, cornerAhHtAwayPrice: null,
    cornerOuHtLine: null, cornerOuHtOverPrice: null, cornerOuHtUnderPrice: null,
    cornerAhFtLine: null, cornerAhFtHomePrice: null, cornerAhFtAwayPrice: null,
    cornerOuFtLine: null, cornerOuFtOverPrice: null, cornerOuFtUnderPrice: null,
    missingMarkets: [],
    dataStatus: "MISSING",
  };

  for (const market of ["AH_HT", "AH_FT", "OU_HT", "OU_FT", "CORNER_AH_HT", "CORNER_AH_FT", "CORNER_OU_HT", "CORNER_OU_FT"] as const) {
    let rows = selected.filter((value) => classifyLiveMarket(value.betName) === market);
    if (market.startsWith("AH") || market === "CORNER_AH_HT" || market === "CORNER_AH_FT") {
      if (rows.some((value) => /^(draw|tie|x)(?:\s|$)/.test(normalized(value.selectionName.trim())))) rows = [];
      const homeRows = rows.filter((value) => selectionSide(value, teams.home, teams.away) === "HOME");
      const awayRows = rows.filter((value) => selectionSide(value, teams.home, teams.away) === "AWAY");
      const pairs = homeRows.flatMap((home) => awayRows.map((away) => ({
        home,
        away,
        homeLine: lineFromValue(home),
        awayLine: lineFromValue(away),
      }))).filter((pair) => pair.homeLine !== null && pair.awayLine !== null &&
        (Math.abs(pair.homeLine + pair.awayLine) < 0.0001 || Math.abs(pair.homeLine - pair.awayLine) < 0.0001) &&
        usableOdds(pair.home) && usableOdds(pair.away));
      const balancedPairs = pairs.map((pair) => ({
        ...pair,
        balanceScore: Math.abs(Number(pair.home.oddNumeric) - 2) + Math.abs(Number(pair.away.oddNumeric) - 2),
      })).filter((pair) => Number.isFinite(pair.balanceScore));
      const paired = pairs.find((pair) => pair.home.main === true && pair.away.main === true) ??
        pairs.find((pair) => pair.home.main === true || pair.away.main === true) ??
        balancedPairs.sort((a, b) => a.balanceScore - b.balanceScore ||
          Math.abs(a.homeLine ?? 0) - Math.abs(b.homeLine ?? 0))[0];
      const loneHome = !paired && homeRows.length === 1 && awayRows.length === 0 && usableOdds(homeRows[0]) ? homeRows[0] : undefined;
      const loneAway = !paired && awayRows.length === 1 && homeRows.length === 0 && usableOdds(awayRows[0]) ? awayRows[0] : undefined;
      const home = paired?.home ?? loneHome;
      const away = paired?.away ?? loneAway;
      const homeLine = paired?.homeLine ?? (home ? lineFromValue(home) : null);
      const awayLine = paired?.awayLine ?? (away ? lineFromValue(away) : null);
      const line = homeLine ?? (awayLine === null ? null : -awayLine);
      if (market === "CORNER_AH_HT") {
        result.cornerAhHtLine = decimal(line);
        result.cornerAhHtHomePrice = home?.oddNumeric ?? null;
        result.cornerAhHtAwayPrice = away?.oddNumeric ?? null;
      } else if (market === "CORNER_AH_FT") {
        result.cornerAhFtLine = decimal(line);
        result.cornerAhFtHomePrice = home?.oddNumeric ?? null;
        result.cornerAhFtAwayPrice = away?.oddNumeric ?? null;
      } else if (market === "AH_HT") {
        result.ahHtLine = decimal(line);
        result.ahHtHomePrice = home?.oddNumeric ?? null;
        result.ahHtAwayPrice = away?.oddNumeric ?? null;
      } else {
        result.ahFtLine = decimal(line);
        result.ahFtHomePrice = home?.oddNumeric ?? null;
        result.ahFtAwayPrice = away?.oddNumeric ?? null;
      }
    } else {
      const overRows = rows.filter((value) => overUnderSide(value) === "OVER");
      const underRows = rows.filter((value) => overUnderSide(value) === "UNDER");
      const pairs = overRows.flatMap((over) => underRows.map((under) => ({
        over,
        under,
        overLine: lineFromValue(over),
        underLine: lineFromValue(under),
      }))).filter((pair) => pair.overLine !== null && pair.underLine !== null &&
        Math.abs(pair.overLine - pair.underLine) < 0.0001 &&
        pair.over.oddNumeric !== null && pair.under.oddNumeric !== null &&
        Number(pair.over.oddNumeric) > 1 && Number(pair.under.oddNumeric) > 1 &&
        pair.over.suspended !== true && pair.under.suspended !== true &&
        pair.over.blocked !== true && pair.under.blocked !== true &&
        pair.over.stopped !== true && pair.under.stopped !== true &&
        pair.over.finished !== true && pair.under.finished !== true);
      const fallbackPairs = pairs.map((pair) => ({
        ...pair,
        balanceScore: Math.abs(Number(pair.over.oddNumeric) - 2) + Math.abs(Number(pair.under.oddNumeric) - 2),
      })).filter((pair) => Number.isFinite(pair.balanceScore));
      const paired = pairs.find((pair) => pair.over.main === true && pair.under.main === true) ??
        pairs.find((pair) => pair.over.main === true || pair.under.main === true) ??
        fallbackPairs.sort((a, b) =>
        a.balanceScore - b.balanceScore ||
        Math.abs((a.overLine ?? 0) - 2) - Math.abs((b.overLine ?? 0) - 2),
        )[0];
      const over = paired?.over;
      const under = paired?.under;
      const line = paired?.overLine ?? null;
      if (market === "CORNER_OU_HT") {
        result.cornerOuHtLine = decimal(line);
        result.cornerOuHtOverPrice = over?.oddNumeric ?? null;
        result.cornerOuHtUnderPrice = under?.oddNumeric ?? null;
      } else if (market === "CORNER_OU_FT") {
        result.cornerOuFtLine = decimal(line);
        result.cornerOuFtOverPrice = over?.oddNumeric ?? null;
        result.cornerOuFtUnderPrice = under?.oddNumeric ?? null;
      } else if (market === "OU_HT") {
        result.ouHtLine = decimal(line);
        result.ouHtOverPrice = over?.oddNumeric ?? null;
        result.ouHtUnderPrice = under?.oddNumeric ?? null;
      } else {
        result.ouFtLine = decimal(line);
        result.ouFtOverPrice = over?.oddNumeric ?? null;
        result.ouFtUnderPrice = under?.oddNumeric ?? null;
      }
    }
  }

  const complete = [
    result.ahHtLine, result.ahHtHomePrice, result.ahHtAwayPrice,
    result.ahFtLine, result.ahFtHomePrice, result.ahFtAwayPrice,
    result.ouHtLine, result.ouHtOverPrice, result.ouHtUnderPrice,
    result.ouFtLine, result.ouFtOverPrice, result.ouFtUnderPrice,
    result.cornerAhHtLine, result.cornerAhHtHomePrice, result.cornerAhHtAwayPrice,
    result.cornerOuHtLine, result.cornerOuHtOverPrice, result.cornerOuHtUnderPrice,
    result.cornerAhFtLine, result.cornerAhFtHomePrice, result.cornerAhFtAwayPrice,
    result.cornerOuFtLine, result.cornerOuFtOverPrice, result.cornerOuFtUnderPrice,
  ];
  const marketFields: Array<[string, Array<string | null>]> = [
    ["AH_HT", [result.ahHtLine, result.ahHtHomePrice, result.ahHtAwayPrice]],
    ["AH_FT", [result.ahFtLine, result.ahFtHomePrice, result.ahFtAwayPrice]],
    ["OU_HT", [result.ouHtLine, result.ouHtOverPrice, result.ouHtUnderPrice]],
    ["OU_FT", [result.ouFtLine, result.ouFtOverPrice, result.ouFtUnderPrice]],
    ["CORNER_AH_HT", [result.cornerAhHtLine, result.cornerAhHtHomePrice, result.cornerAhHtAwayPrice]],
    ["CORNER_OU_HT", [result.cornerOuHtLine, result.cornerOuHtOverPrice, result.cornerOuHtUnderPrice]],
    ["CORNER_AH_FT", [result.cornerAhFtLine, result.cornerAhFtHomePrice, result.cornerAhFtAwayPrice]],
    ["CORNER_OU_FT", [result.cornerOuFtLine, result.cornerOuFtOverPrice, result.cornerOuFtUnderPrice]],
  ];
  result.missingMarkets = marketFields.filter(([, fields]) => fields.some((field) => field === null)).map(([key]) => key);
  result.dataStatus = complete.every((field) => field !== null)
    ? "COMPLETE"
    : selected.length ? "PARTIAL" : "MISSING";
  return result;
}

export function dueLiveSlot(status: string, elapsedMinute: number | null, elapsedExtraTime = 0, intervalMinutes = 5) {
  if (elapsedMinute === null || !Number.isFinite(elapsedMinute)) return null;
  const short = status.toUpperCase();
  const interval = Math.max(1, Math.floor(intervalMinutes));
  let period: PeriodKey;
  let minimum: number;
  let maximum: number;
  if (short === "1H") {
    period = "1H"; minimum = 0; maximum = 45;
  } else if (short === "2H") {
    period = "2H"; minimum = Math.ceil(46 / interval) * interval; maximum = 90;
  } else if (short === "ET") {
    period = "ET"; minimum = Math.ceil(91 / interval) * interval; maximum = 120;
  } else {
    return null;
  }
  const actualMinute = Math.max(0, elapsedMinute + Math.max(0, elapsedExtraTime));
  const targetMinute = Math.min(maximum, Math.floor(actualMinute / interval) * interval);
  if (targetMinute < minimum) return null;
  return { slotKey: `${period}_${targetMinute}`, period, targetMinute, actualMinute };
}

export function snapshotSlotDefinitions(intervalMinutes = 5) {
  const interval = Math.max(1, Math.floor(intervalMinutes));
  const slotsBetween = (period: PeriodKey, start: number, end: number) => {
    const slots: Array<{ slotKey: string; targetMinute: number; period: PeriodKey }> = [];
    for (let minute = start; minute <= end; minute += interval) {
      slots.push({ slotKey: `${period}_${minute}`, targetMinute: minute, period });
    }
    return slots;
  };
  return [
    { slotKey: PREMATCH_SLOT_KEY, targetMinute: -PREMATCH_MINUTES, period: "PREMATCH" },
    ...slotsBetween("1H", 0, 45),
    ...slotsBetween("2H", Math.ceil(46 / interval) * interval, 90),
    ...slotsBetween("ET", Math.ceil(91 / interval) * interval, 120),
  ];
}
