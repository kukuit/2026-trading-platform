import { prisma } from "../prisma";
import { displayHandicapLines } from "./markets";
import { FOOTBALL_LEAGUES } from "./leagues";

const OUTCOMES = ["WIN", "HALF_WIN", "PUSH", "HALF_LOSS", "LOSS"] as const;
type Outcome = typeof OUTCOMES[number];

const MARKETS = [
  { key: "ahHt", label: "Chấp H1", line: "ahHtLine", firstPrice: "ahHtHomePrice", secondPrice: "ahHtAwayPrice", firstSelection: "Nhà", secondSelection: "Khách", firstOutcome: "ahHtHome", secondOutcome: "ahHtAway" },
  { key: "ouHt", label: "Tài/Xỉu H1", line: "ouHtLine", firstPrice: "ouHtOverPrice", secondPrice: "ouHtUnderPrice", firstSelection: "Tài", secondSelection: "Xỉu", firstOutcome: "ouHtOver", secondOutcome: "ouHtUnder" },
  { key: "ahFt", label: "Chấp FT", line: "ahFtLine", firstPrice: "ahFtHomePrice", secondPrice: "ahFtAwayPrice", firstSelection: "Nhà", secondSelection: "Khách", firstOutcome: "ahFtHome", secondOutcome: "ahFtAway" },
  { key: "ouFt", label: "Tài/Xỉu FT", line: "ouFtLine", firstPrice: "ouFtOverPrice", secondPrice: "ouFtUnderPrice", firstSelection: "Tài", secondSelection: "Xỉu", firstOutcome: "ouFtOver", secondOutcome: "ouFtUnder" },
  { key: "cornerAhHt", label: "Chấp góc H1", line: "cornerAhHtLine", firstPrice: "cornerAhHtHomePrice", secondPrice: "cornerAhHtAwayPrice", firstSelection: "Nhà", secondSelection: "Khách", firstOutcome: "cornerAhHtHome", secondOutcome: "cornerAhHtAway" },
  { key: "cornerOuHt", label: "Tài/Xỉu góc H1", line: "cornerOuHtLine", firstPrice: "cornerOuHtOverPrice", secondPrice: "cornerOuHtUnderPrice", firstSelection: "Tài", secondSelection: "Xỉu", firstOutcome: "cornerOuHtOver", secondOutcome: "cornerOuHtUnder" },
  { key: "cornerAhFt", label: "Chấp góc FT", line: "cornerAhFtLine", firstPrice: "cornerAhFtHomePrice", secondPrice: "cornerAhFtAwayPrice", firstSelection: "Nhà", secondSelection: "Khách", firstOutcome: "cornerAhFtHome", secondOutcome: "cornerAhFtAway" },
  { key: "cornerOuFt", label: "Tài/Xỉu góc FT", line: "cornerOuFtLine", firstPrice: "cornerOuFtOverPrice", secondPrice: "cornerOuFtUnderPrice", firstSelection: "Tài", secondSelection: "Xỉu", firstOutcome: "cornerOuFtOver", secondOutcome: "cornerOuFtUnder" },
] as const;

type MatchSample = {
  fixtureId: string;
  providerFixtureId: number;
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: string;
  actualMinute: number;
  score: string;
  corners: string | null;
  finalScore: string;
  finalCorners: string | null;
  firstPrice: string;
  secondPrice: string;
  outcome: Outcome;
};

type Scenario = {
  key: string;
  bucketStart: number;
  bucketEnd: number;
  score: string;
  corners: string | null;
  marketKey: string;
  marketLabel: string;
  selection: string;
  line: string;
  priceTolerance: number;
  matches: Map<string, MatchSample>;
};

function pricePairWithinTolerance(left: MatchSample, right: MatchSample, tolerance: number) {
  const leftPrices = [Number(left.firstPrice), Number(left.secondPrice)];
  const rightPrices = [Number(right.firstPrice), Number(right.secondPrice)];
  return leftPrices.every((price, index) => Number.isFinite(price) && Number.isFinite(rightPrices[index]) && Math.abs(price - rightPrices[index]) <= tolerance + 1e-9);
}

function stringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function outcomeValue(value: unknown): Outcome | null {
  return typeof value === "string" && OUTCOMES.includes(value as Outcome) ? value as Outcome : null;
}

function dateBoundary(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Dates must use YYYY-MM-DD.");
  const calendarDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== value) throw new Error("Invalid date range.");
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+07:00`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date range.");
  return date;
}

export async function getFootballAnalytics(input: {
  bucketSize?: number;
  from?: string;
  to?: string;
  priceTolerance?: number;
  leagueFilter?: string;
}) {
  const bucketSize = input.bucketSize ?? 5;
  if (![1, 2, 3, 5, 10, 15].includes(bucketSize)) throw new Error("Bucket size must be 1, 2, 3, 5, 10, or 15 minutes.");
  const priceTolerance = input.priceTolerance ?? 0;
  if (![0, 0.1, 0.2, 0.3, 0.4, 0.5].includes(priceTolerance)) throw new Error("Price tolerance must be 0 or from 0.1 to 0.5.");
  const from = dateBoundary(input.from);
  const to = dateBoundary(input.to, true);
  if (from && to && from > to) throw new Error("Start date must be before end date.");
  if (from && to && to.getTime() - from.getTime() > 370 * 86_400_000) throw new Error("Analytics date range cannot exceed 370 days.");

  const savedLeagueIds = FOOTBALL_LEAGUES.map((league) => league.id);
  const leagueFilter = input.leagueFilter ?? "ALL";
  const fixtureLeagueFilter = leagueFilter === "SAVED"
    ? { in: savedLeagueIds }
    : leagueFilter === "OTHER"
      ? { notIn: savedLeagueIds }
      : leagueFilter === "ALL"
        ? undefined
        : { equals: Number(leagueFilter) };

  const snapshots = await prisma.footballOddsSnapshot.findMany({
    where: {
      sourceType: "LIVE",
      isTest: false,
      actualMinute: { not: null },
      fixture: {
        isTestFixture: false,
        status: { in: ["FT", "AET", "PEN"] },
        homeScoreFt: { not: null },
        awayScoreFt: { not: null },
        ...(fixtureLeagueFilter ? { providerLeagueId: fixtureLeagueFilter } : {}),
        ...(from || to ? { kickoffAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
    },
    select: {
      id: true,
      fixtureId: true,
      sourceType: true,
      capturedAt: true,
      actualMinute: true,
      period: true,
      fixtureStatus: true,
      homeScore: true,
      awayScore: true,
      homeCornerKicks: true,
      awayCornerKicks: true,
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
      cornerAhHtLine: true,
      cornerAhHtHomePrice: true,
      cornerAhHtAwayPrice: true,
      cornerAhFtLine: true,
      cornerAhFtHomePrice: true,
      cornerAhFtAwayPrice: true,
      cornerOuHtLine: true,
      cornerOuHtOverPrice: true,
      cornerOuHtUnderPrice: true,
      cornerOuFtLine: true,
      cornerOuFtOverPrice: true,
      cornerOuFtUnderPrice: true,
      settlementData: true,
      fixture: {
        select: {
          providerFixtureId: true,
          homeTeamName: true,
          awayTeamName: true,
          kickoffAt: true,
          homeScoreHt: true,
          awayScoreHt: true,
          homeScoreFt: true,
          awayScoreFt: true,
          homeCornerKicksHt: true,
          awayCornerKicksHt: true,
          homeCornerKicksFt: true,
          awayCornerKicksFt: true,
        },
      },
    },
  });

  const scenarios = new Map<string, Scenario>();
  const scenariosByBaseKey = new Map<string, Scenario[]>();
  snapshots.sort((left, right) => left.actualMinute! - right.actualMinute! || left.capturedAt.getTime() - right.capturedAt.getTime());
  for (const snapshot of snapshots) {
    const actualMinute = snapshot.actualMinute;
    if (actualMinute === null || snapshot.homeScore === null || snapshot.awayScore === null || !snapshot.settlementData) continue;
    const bucketStart = Math.floor(actualMinute / bucketSize) * bucketSize;
    const bucketEnd = bucketStart + bucketSize - 1;
    const score = `${snapshot.homeScore}:${snapshot.awayScore}`;
    const snapshotCorners = snapshot.homeCornerKicks === null || snapshot.awayCornerKicks === null
      ? null
      : `${snapshot.homeCornerKicks}:${snapshot.awayCornerKicks}`;
    const snapshotValues = snapshot as unknown as Record<string, unknown>;
    const outcomes = snapshot.settlementData as Record<string, unknown>;
    const displayLines = displayHandicapLines(snapshot);

    for (const market of MARKETS) {
      const isCornerMarket = market.key.startsWith("corner");
      if (isCornerMarket && snapshotCorners === null) continue;
      const corners = isCornerMarket ? snapshotCorners : null;
      const lineKey = market.line as keyof typeof displayLines;
      const line = stringValue(lineKey in displayLines ? displayLines[lineKey] : snapshotValues[market.line]);
      if (line === null) continue;
      const firstPrice = stringValue(snapshotValues[market.firstPrice]);
      const secondPrice = stringValue(snapshotValues[market.secondPrice]);
      const selections = [
        { label: market.firstSelection, price: firstPrice, result: outcomeValue(outcomes[market.firstOutcome]) },
        { label: market.secondSelection, price: secondPrice, result: outcomeValue(outcomes[market.secondOutcome]) },
      ];

      for (const selection of selections) {
        if (!selection.price || !selection.result) continue;
        const sample: MatchSample = {
          fixtureId: snapshot.fixtureId,
          providerFixtureId: snapshot.fixture.providerFixtureId,
          homeTeamName: snapshot.fixture.homeTeamName,
          awayTeamName: snapshot.fixture.awayTeamName,
          kickoffAt: snapshot.fixture.kickoffAt.toISOString(),
          actualMinute,
          score,
          corners,
          finalScore: market.key.endsWith("Ht")
            ? `${snapshot.fixture.homeScoreHt ?? "—"}:${snapshot.fixture.awayScoreHt ?? "—"}`
            : `${snapshot.fixture.homeScoreFt}:${snapshot.fixture.awayScoreFt}`,
          finalCorners: isCornerMarket
            ? market.key.endsWith("Ht")
              ? snapshot.fixture.homeCornerKicksHt === null || snapshot.fixture.awayCornerKicksHt === null
                ? null
                : `${snapshot.fixture.homeCornerKicksHt}:${snapshot.fixture.awayCornerKicksHt}`
              : snapshot.fixture.homeCornerKicksFt === null || snapshot.fixture.awayCornerKicksFt === null
                ? null
                : `${snapshot.fixture.homeCornerKicksFt}:${snapshot.fixture.awayCornerKicksFt}`
            : null,
          firstPrice: firstPrice ?? "—",
          secondPrice: secondPrice ?? "—",
          outcome: selection.result,
        };
        const baseKey = [bucketStart, bucketEnd, score, corners ?? "", market.key, selection.label, line].join("|");
        const priceScenarios = scenariosByBaseKey.get(baseKey) ?? [];
        let scenario = priceScenarios.find((candidate) =>
          Array.from(candidate.matches.values()).every((existing) => pricePairWithinTolerance(existing, sample, priceTolerance)));
        if (!scenario) {
          const key = `${baseKey}|prices:${priceScenarios.length}`;
          scenario = {
            key,
            bucketStart,
            bucketEnd,
            score,
            corners,
            marketKey: market.key,
            marketLabel: market.label,
            selection: selection.label,
            line,
            priceTolerance,
            matches: new Map(),
          };
          priceScenarios.push(scenario);
          scenariosByBaseKey.set(baseKey, priceScenarios);
          scenarios.set(key, scenario);
        }
        const existing = scenario.matches.get(snapshot.fixtureId);
        if (!existing || existing.actualMinute < actualMinute ||
          existing.actualMinute === actualMinute && existing.firstPrice === sample.firstPrice && existing.secondPrice === sample.secondPrice) {
          scenario.matches.set(snapshot.fixtureId, sample);
        }
      }
    }
  }

  const groups = Array.from(scenarios.values())
    .map((scenario) => {
      const matches = Array.from(scenario.matches.values()).sort((a, b) => b.kickoffAt.localeCompare(a.kickoffAt));
      const outcomes = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, matches.filter((match) => match.outcome === outcome).length])) as Record<Outcome, number>;
      const decided = outcomes.WIN + outcomes.LOSS + outcomes.HALF_WIN + outcomes.HALF_LOSS;
      const winRate = decided ? Math.round(((outcomes.WIN + outcomes.HALF_WIN * 0.5) / decided) * 1000) / 10 : null;
      return {
        key: scenario.key,
        bucketStart: scenario.bucketStart,
        bucketEnd: scenario.bucketEnd,
        score: scenario.score,
        corners: scenario.corners,
        marketKey: scenario.marketKey,
        marketLabel: scenario.marketLabel,
        selection: scenario.selection,
        line: scenario.line,
        priceTolerance: scenario.priceTolerance,
        matchCount: matches.length,
        outcomes,
        winRate,
        matches,
      };
    })
    .filter((group) => group.matchCount >= 2)
    .sort((a, b) => b.matchCount - a.matchCount || a.bucketStart - b.bucketStart || a.marketLabel.localeCompare(b.marketLabel) || a.score.localeCompare(b.score));

  return {
    bucketSize,
    priceTolerance,
    snapshotCount: snapshots.length,
    groupCount: groups.length,
    groups,
  };
}
