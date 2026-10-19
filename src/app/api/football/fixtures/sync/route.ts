import { z } from "zod";
import { withFootballAdmin } from "@/lib/football/route";
import { FOOTBALL_LEAGUES } from "@/lib/football/leagues";
import { syncFixtureRange } from "@/lib/football/operations";

export const runtime = "nodejs";

const schema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  leagueIds: z.array(z.number().int().refine((id) => FOOTBALL_LEAGUES.some((league) => league.id === id))).max(FOOTBALL_LEAGUES.length).optional(),
}).strict();

export async function POST(request: Request) {
  return withFootballAdmin(request, async () => syncFixtureRange(schema.parse(await request.json().catch(() => ({})))));
}
