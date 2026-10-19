import { z } from "zod";
import { withFootballAdmin } from "@/lib/football/route";
import { saveOddsSnapshot } from "@/lib/football/service";

export const runtime = "nodejs";

const fixtureSchema = z.object({
  providerFixtureId: z.number().int().positive(),
  providerLeagueId: z.number().int().nonnegative(),
  season: z.number().int().min(1900).max(2100),
  homeTeamId: z.number().int().nullable(),
  awayTeamId: z.number().int().nullable(),
  homeTeamName: z.string().min(1).max(191),
  awayTeamName: z.string().min(1).max(191),
  homeTeamLogo: z.string().max(512).nullable(),
  awayTeamLogo: z.string().max(512).nullable(),
  kickoffAt: z.coerce.date(),
  status: z.string().min(1).max(16),
  elapsedMinute: z.number().int().nullable(),
  elapsedExtraTime: z.number().int().nonnegative().default(0),
  homeScore: z.number().int().nullable(),
  awayScore: z.number().int().nullable(),
  homeScoreHt: z.number().int().nullable().default(null),
  awayScoreHt: z.number().int().nullable().default(null),
  homeScoreFt: z.number().int().nullable().default(null),
  awayScoreFt: z.number().int().nullable().default(null),
});

const schema = z.object({
  fixtureId: z.number().int().positive(),
  raw: z.record(z.string(), z.unknown()),
  fixture: fixtureSchema.nullable().optional(),
}).strict().superRefine((body, context) => {
  if (body.fixture && body.fixture.providerFixtureId !== body.fixtureId) {
    context.addIssue({ code: "custom", message: "Fixture ID does not match odds response." });
  }
});

export async function POST(request: Request) {
  return withFootballAdmin(request, async () => {
    const body = schema.parse(await request.json());
    return saveOddsSnapshot({
      fixtureId: body.fixtureId,
      raw: body.raw,
      fixture: body.fixture ?? null,
      isTest: true,
    });
  });
}

