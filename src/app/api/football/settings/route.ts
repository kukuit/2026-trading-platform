import { z } from "zod";
import { withFootballAdmin } from "@/lib/football/route";
import { FOOTBALL_LEAGUES } from "@/lib/football/leagues";
import { getFootballSettings, updateFootballSettings } from "@/lib/football/service";

export const runtime = "nodejs";

const settingsSchema = z.object({
  leagueIds: z.array(z.number().int().refine((id) => FOOTBALL_LEAGUES.some((league) => league.id === id)))
    .max(FOOTBALL_LEAGUES.length)
    .refine((ids) => new Set(ids).size === ids.length, "Competition IDs must be unique."),
  season: z.number().int().min(1900).max(2100),
  pollingIntervalSeconds: z.number().int().min(300).max(3600),
  dailyTotalLimit: z.number().int().min(1).max(7500),
  dailyOddsBudget: z.number().int().min(0).max(7500),
  dailyReservedBudget: z.number().int().min(0).max(7500),
  isCollectorEnabled: z.boolean().optional(),
  oddsIntervalMinutes: z.number().int().min(1).max(15).optional(),
  fixtureSyncIntervalHours: z.number().int().min(1).max(24).optional(),
  statusCheckIntervalSeconds: z.number().int().min(60).max(3600).optional(),
  preferredBookmakerId: z.number().int().positive().nullable().optional(),
}).strict().superRefine((settings, context) => {
  if (settings.dailyOddsBudget + settings.dailyReservedBudget > settings.dailyTotalLimit) {
    context.addIssue({ code: "custom", message: "Odds and reserved budgets cannot exceed the daily total." });
  }
});

export async function GET(request: Request) {
  return withFootballAdmin(request, getFootballSettings);
}

export async function PATCH(request: Request) {
  return withFootballAdmin(request, async () => {
    const body = settingsSchema.parse(await request.json());
    return updateFootballSettings(body);
  });
}

