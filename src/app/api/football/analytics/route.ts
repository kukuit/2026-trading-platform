import { NextResponse } from "next/server";
import { z } from "zod";
import { getFootballAnalytics } from "@/lib/football/analytics";
import { FOOTBALL_LEAGUES } from "@/lib/football/leagues";
import { withFootballAdmin } from "@/lib/football/route";

export const runtime = "nodejs";

const querySchema = z.object({
  bucketSize: z.coerce.number().int().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priceTolerance: z.coerce.number().optional(),
  league: z.string().optional(),
}).strict();

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid analytics filters." }, { status: 400 });
  if (parsed.data.bucketSize !== undefined && ![1, 2, 3, 5, 10, 15].includes(parsed.data.bucketSize)) {
    return NextResponse.json({ error: "Bucket size must be 1, 2, 3, 5, 10, or 15 minutes." }, { status: 400 });
  }
  if (parsed.data.priceTolerance !== undefined && ![0, 0.1, 0.2, 0.3, 0.4, 0.5].includes(parsed.data.priceTolerance)) {
    return NextResponse.json({ error: "Price tolerance must be 0 or from 0.1 to 0.5." }, { status: 400 });
  }
  const leagueFilter = parsed.data.league ?? "ALL";
  if (![
    "ALL",
    "SAVED",
    "OTHER",
    ...FOOTBALL_LEAGUES.map((league) => String(league.id)),
  ].includes(leagueFilter)) {
    return NextResponse.json({ error: "Invalid analytics league filter." }, { status: 400 });
  }
  const dates = [parsed.data.from, parsed.data.to].filter((value): value is string => Boolean(value));
  if (dates.some((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value;
  })) return NextResponse.json({ error: "Invalid analytics date." }, { status: 400 });
  const from = parsed.data.from ? new Date(`${parsed.data.from}T00:00:00.000Z`) : null;
  const to = parsed.data.to ? new Date(`${parsed.data.to}T00:00:00.000Z`) : null;
  if (from && to && (from > to || to.getTime() - from.getTime() > 370 * 86_400_000)) {
    return NextResponse.json({ error: "Invalid analytics date range; maximum range is 370 days." }, { status: 400 });
  }

  return withFootballAdmin(request, () => getFootballAnalytics({
    ...parsed.data,
    priceTolerance: parsed.data.priceTolerance ?? 0,
    leagueFilter,
  }));
}
