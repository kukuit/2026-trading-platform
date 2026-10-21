import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export type MarketSettlement = "WIN" | "LOSS" | "PUSH" | "HALF_WIN" | "HALF_LOSS";
export type SnapshotSettlement = Partial<Record<
  | "ahHtHome" | "ahHtAway" | "ouHtOver" | "ouHtUnder"
  | "ahFtHome" | "ahFtAway" | "ouFtOver" | "ouFtUnder"
  | "cornerAhHtHome" | "cornerAhHtAway" | "cornerOuHtOver" | "cornerOuHtUnder"
  | "cornerAhFtHome" | "cornerAhFtAway" | "cornerOuFtOver" | "cornerOuFtUnder",
  MarketSettlement
>>;

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function lineParts(line: number) {
  const quarterUnits = line * 4;
  const roundedUnits = Math.round(quarterUnits);
  if (Math.abs(quarterUnits - roundedUnits) > 1e-7 || Math.abs(roundedUnits % 2) !== 1) return [line];
  return [Math.floor(roundedUnits / 2) * 0.5, Math.ceil(roundedUnits / 2) * 0.5];
}

function outcomeFromMargin(margin: number): MarketSettlement {
  if (margin > 1e-7) return "WIN";
  if (margin < -1e-7) return "LOSS";
  return "PUSH";
}

function invertOutcome(outcome: MarketSettlement): MarketSettlement {
  if (outcome === "WIN") return "LOSS";
  if (outcome === "LOSS") return "WIN";
  if (outcome === "HALF_WIN") return "HALF_LOSS";
  if (outcome === "HALF_LOSS") return "HALF_WIN";
  return "PUSH";
}

function combineOutcomes(outcomes: MarketSettlement[]): MarketSettlement {
  if (!outcomes.length) return "PUSH";
  if (outcomes.every((outcome) => outcome === outcomes[0])) return outcomes[0];
  if (outcomes.includes("PUSH") && outcomes.includes("WIN")) return "HALF_WIN";
  if (outcomes.includes("PUSH") && outcomes.includes("LOSS")) return "HALF_LOSS";
  return outcomes[0];
}

function handicapOutcomes(homeScore: number, awayScore: number, line: number) {
  // `line` is the bookmaker's signed line for the home selection (for example,
  // -0.5 when the home team gives half a goal). Apply it to the final margin once.
  const homeParts = lineParts(line).map((part) => outcomeFromMargin(homeScore - awayScore + part));
  const awayParts = homeParts.map(invertOutcome);
  return { home: combineOutcomes(homeParts), away: combineOutcomes(awayParts) };
}

function totalOutcomes(totalGoals: number, line: number) {
  const overParts = lineParts(line).map((part) => outcomeFromMargin(totalGoals - part));
  const underParts = overParts.map(invertOutcome);
  return { over: combineOutcomes(overParts), under: combineOutcomes(underParts) };
}

function firstHalfMarketIsOpen(snapshot: { sourceType: string; period: string | null; actualMinute: number | null }) {
  if (snapshot.sourceType === "PREMATCH") return true;
  const period = snapshot.period?.toUpperCase();
  if (period === "2H" || period === "ET") return false;
  if (period === "1H") return true;
  return snapshot.actualMinute === null || snapshot.actualMinute <= 45;
}

function calculateSettlement(snapshot: {
  sourceType: string;
  period: string | null;
  actualMinute: number | null;
  ahHtLine: unknown;
  ahFtLine: unknown;
  ouHtLine: unknown;
  ouFtLine: unknown;
  cornerAhHtLine: unknown;
  cornerAhFtLine: unknown;
  cornerOuHtLine: unknown;
  cornerOuFtLine: unknown;
}, fixture: {
  homeScoreHt: number | null;
  awayScoreHt: number | null;
  homeScoreFt: number | null;
  awayScoreFt: number | null;
  homeCornerKicksHt: number | null;
  awayCornerKicksHt: number | null;
  homeCornerKicksFt: number | null;
  awayCornerKicksFt: number | null;
}): SnapshotSettlement | null {
  const settlement: SnapshotSettlement = {};
  const firstHalfOpen = firstHalfMarketIsOpen(snapshot);

  if (firstHalfOpen && fixture.homeScoreHt !== null && fixture.awayScoreHt !== null) {
    const ahLine = numberOrNull(snapshot.ahHtLine);
    const ouLine = numberOrNull(snapshot.ouHtLine);
    if (ahLine !== null) {
      const outcomes = handicapOutcomes(fixture.homeScoreHt, fixture.awayScoreHt, ahLine);
      Object.assign(settlement, { ahHtHome: outcomes.home, ahHtAway: outcomes.away });
    }
    if (ouLine !== null) Object.assign(settlement, {
      ouHtOver: totalOutcomes(fixture.homeScoreHt + fixture.awayScoreHt, ouLine).over,
      ouHtUnder: totalOutcomes(fixture.homeScoreHt + fixture.awayScoreHt, ouLine).under,
    });

    if (fixture.homeCornerKicksHt !== null && fixture.awayCornerKicksHt !== null) {
      const ahLine = numberOrNull(snapshot.cornerAhHtLine);
      const ouLine = numberOrNull(snapshot.cornerOuHtLine);
      if (ahLine !== null) {
        const outcomes = handicapOutcomes(fixture.homeCornerKicksHt, fixture.awayCornerKicksHt, ahLine);
        Object.assign(settlement, { cornerAhHtHome: outcomes.home, cornerAhHtAway: outcomes.away });
      }
      if (ouLine !== null) Object.assign(settlement, {
        cornerOuHtOver: totalOutcomes(fixture.homeCornerKicksHt + fixture.awayCornerKicksHt, ouLine).over,
        cornerOuHtUnder: totalOutcomes(fixture.homeCornerKicksHt + fixture.awayCornerKicksHt, ouLine).under,
      });
    }
  }

  if (fixture.homeScoreFt !== null && fixture.awayScoreFt !== null) {
    const ahLine = numberOrNull(snapshot.ahFtLine);
    const ouLine = numberOrNull(snapshot.ouFtLine);
    if (ahLine !== null) {
      const outcomes = handicapOutcomes(fixture.homeScoreFt, fixture.awayScoreFt, ahLine);
      Object.assign(settlement, { ahFtHome: outcomes.home, ahFtAway: outcomes.away });
    }
    if (ouLine !== null) Object.assign(settlement, {
      ouFtOver: totalOutcomes(fixture.homeScoreFt + fixture.awayScoreFt, ouLine).over,
      ouFtUnder: totalOutcomes(fixture.homeScoreFt + fixture.awayScoreFt, ouLine).under,
    });

    if (fixture.homeCornerKicksFt !== null && fixture.awayCornerKicksFt !== null) {
      const ahLine = numberOrNull(snapshot.cornerAhFtLine);
      const ouLine = numberOrNull(snapshot.cornerOuFtLine);
      if (ahLine !== null) {
        const outcomes = handicapOutcomes(fixture.homeCornerKicksFt, fixture.awayCornerKicksFt, ahLine);
        Object.assign(settlement, { cornerAhFtHome: outcomes.home, cornerAhFtAway: outcomes.away });
      }
      if (ouLine !== null) Object.assign(settlement, {
        cornerOuFtOver: totalOutcomes(fixture.homeCornerKicksFt + fixture.awayCornerKicksFt, ouLine).over,
        cornerOuFtUnder: totalOutcomes(fixture.homeCornerKicksFt + fixture.awayCornerKicksFt, ouLine).under,
      });
    }
  }

  return Object.keys(settlement).length ? settlement : null;
}

export async function settleFixtureOdds(fixtureId: string) {
  try {
    const fixture = await prisma.footballFixture.findUnique({
      where: { id: fixtureId },
      select: {
        status: true,
        homeScoreHt: true,
        awayScoreHt: true,
        homeScoreFt: true,
        awayScoreFt: true,
        homeCornerKicksHt: true,
        awayCornerKicksHt: true,
        homeCornerKicksFt: true,
        awayCornerKicksFt: true,
      },
    });
    if (!fixture || !["FT", "AET", "PEN"].includes(fixture.status) || fixture.homeScoreFt === null || fixture.awayScoreFt === null) return 0;

    const snapshots = await prisma.footballOddsSnapshot.findMany({
      where: { fixtureId },
      select: {
        id: true,
        sourceType: true,
        period: true,
        actualMinute: true,
        ahHtLine: true,
        ahFtLine: true,
        ouHtLine: true,
        ouFtLine: true,
        cornerAhHtLine: true,
        cornerAhFtLine: true,
        cornerOuHtLine: true,
        cornerOuFtLine: true,
        settlementData: true,
      },
    });

    const updates = snapshots.flatMap((snapshot) => {
      const settlementData = calculateSettlement(snapshot, fixture);
      if (JSON.stringify(snapshot.settlementData) === JSON.stringify(settlementData)) return [];
      return [prisma.footballOddsSnapshot.update({
        where: { id: snapshot.id },
        data: { settlementData: settlementData ? settlementData as Prisma.InputJsonObject : Prisma.DbNull },
      })];
    });
    if (updates.length) await prisma.$transaction(updates);
    return updates.length;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") return 0;
    throw error;
  }
}
