import type { NormalizedOddsValue } from "./normalizer";

export type MarketKey = "AH_HT" | "AH_FT" | "OU_HT" | "OU_FT";
export type PeriodKey = "1H" | "2H" | "ET";

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
  const period = periodFromMarket(text);
  if (!period) return null;
  if (/asian\s+handicap|\bhandicap\b/.test(text)) return period === "HT" ? "AH_HT" : "AH_FT";
  if (/over\s*\/\s*under|over under|total goals|\btotals?\b/.test(text)) return period === "HT" ? "OU_HT" : "OU_FT";
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
  if (/^(home|1|team 1)$/.test(text) || text.startsWith(`${home} `) || text === home) return "HOME";
  if (/^(away|2|team 2)$/.test(text) || text.startsWith(`${away} `) || text === away) return "AWAY";
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
    missingMarkets: [],
    dataStatus: "MISSING",
  };

  for (const market of ["AH_HT", "AH_FT", "OU_HT", "OU_FT"] as const) {
    const rows = selected.filter((value) => classifyLiveMarket(value.betName) === market);
    if (market.startsWith("AH")) {
      const home = rows.find((value) => selectionSide(value, teams.home, teams.away) === "HOME");
      const away = rows.find((value) => selectionSide(value, teams.home, teams.away) === "AWAY");
      const homeLine = home ? lineFromValue(home) : null;
      const awayLine = away ? lineFromValue(away) : null;
      const line = homeLine ?? (awayLine === null ? null : -awayLine);
      if (market === "AH_HT") {
        result.ahHtLine = decimal(line);
        result.ahHtHomePrice = home?.oddNumeric ?? null;
        result.ahHtAwayPrice = away?.oddNumeric ?? null;
      } else {
        result.ahFtLine = decimal(line);
        result.ahFtHomePrice = home?.oddNumeric ?? null;
        result.ahFtAwayPrice = away?.oddNumeric ?? null;
      }
    } else {
      const over = rows.find((value) => overUnderSide(value) === "OVER");
      const under = rows.find((value) => overUnderSide(value) === "UNDER");
      const line = (over && lineFromValue(over)) ?? (under && lineFromValue(under)) ?? null;
      if (market === "OU_HT") {
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
  ];
  const marketFields: Array<[string, Array<string | null>]> = [
    ["AH_HT", [result.ahHtLine, result.ahHtHomePrice, result.ahHtAwayPrice]],
    ["AH_FT", [result.ahFtLine, result.ahFtHomePrice, result.ahFtAwayPrice]],
    ["OU_HT", [result.ouHtLine, result.ouHtOverPrice, result.ouHtUnderPrice]],
    ["OU_FT", [result.ouFtLine, result.ouFtOverPrice, result.ouFtUnderPrice]],
  ];
  result.missingMarkets = marketFields.filter(([, fields]) => fields.some((field) => field === null)).map(([key]) => key);
  result.dataStatus = complete.every((field) => field !== null)
    ? "COMPLETE"
    : selected.length ? "PARTIAL" : "MISSING";
  return result;
}

export function dueLiveSlot(status: string, elapsedMinute: number | null, elapsedExtraTime = 0) {
  if (elapsedMinute === null || !Number.isFinite(elapsedMinute)) return null;
  const short = status.toUpperCase();
  let period: PeriodKey;
  let minimum: number;
  let maximum: number;
  if (short === "1H") {
    period = "1H"; minimum = 0; maximum = 45;
  } else if (short === "2H") {
    period = "2H"; minimum = 50; maximum = 90;
  } else if (short === "ET") {
    period = "ET"; minimum = 95; maximum = 120;
  } else {
    return null;
  }
  const actualMinute = Math.max(0, elapsedMinute + Math.max(0, elapsedExtraTime));
  const targetMinute = Math.min(maximum, Math.floor(actualMinute / 5) * 5);
  if (targetMinute < minimum) return null;
  return { slotKey: `${period}_${targetMinute}`, period, targetMinute, actualMinute };
}

export function snapshotSlotDefinitions() {
  return [
    ...Array.from({ length: 10 }, (_, index) => ({ slotKey: `1H_${index * 5}`, targetMinute: index * 5, period: "1H" })),
    ...Array.from({ length: 9 }, (_, index) => ({ slotKey: `2H_${(index + 10) * 5}`, targetMinute: (index + 10) * 5, period: "2H" })),
    ...Array.from({ length: 6 }, (_, index) => ({ slotKey: `ET_${(index + 19) * 5}`, targetMinute: (index + 19) * 5, period: "ET" })),
  ];
}
