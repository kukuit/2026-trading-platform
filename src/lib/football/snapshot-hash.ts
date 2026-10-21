import { createHash } from "node:crypto";
import type { StructuredMarkets } from "./markets";
import { stableStringify } from "./normalizer";

type CompactSnapshotHashInput = {
  fixtureId: string;
  sourceType: "LIVE" | "PREMATCH";
  isTest: boolean;
  slotKey: string | null;
  targetMinute: number | null;
  actualMinute: number | null;
  period: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeCornerKicks: number | null;
  awayCornerKicks: number | null;
  fixtureStatus: string | null;
  markets: StructuredMarkets;
};

export function compactSnapshotHash(input: CompactSnapshotHashInput) {
  const { markets, ...snapshot } = input;
  const visibleMarkets = {
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
  };

  return createHash("sha256")
    .update(stableStringify({ ...snapshot, markets: visibleMarkets }))
    .digest("hex");
}
