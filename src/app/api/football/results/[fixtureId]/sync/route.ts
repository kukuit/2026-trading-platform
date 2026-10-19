import { withFootballAdmin } from "@/lib/football/route";
import { syncFixtureResult } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { fixtureId: string } }) {
  return withFootballAdmin(request, async () => {
    const fixtureId = Number(context.params.fixtureId);
    if (!Number.isInteger(fixtureId) || fixtureId <= 0) throw new Error("Invalid fixture ID.");
    return syncFixtureResult(fixtureId);
  });
}
