import { z } from "zod";
import { withFootballAdmin } from "@/lib/football/route";
import { updateFixtureResultManually } from "@/lib/football/operations";

export const runtime = "nodejs";

const schema = z.object({
  homeScoreHt: z.number().int().min(0).max(99), awayScoreHt: z.number().int().min(0).max(99),
  homeScoreFt: z.number().int().min(0).max(99), awayScoreFt: z.number().int().min(0).max(99),
}).strict();

export async function PATCH(request: Request, context: { params: { fixtureId: string } }) {
  return withFootballAdmin(request, async () => {
    const fixtureId = Number(context.params.fixtureId);
    if (!Number.isInteger(fixtureId) || fixtureId <= 0) throw new Error("Invalid fixture ID.");
    return updateFixtureResultManually(fixtureId, schema.parse(await request.json()));
  });
}
