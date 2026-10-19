import { z } from "zod";
import { withFootballAdmin } from "@/lib/football/route";
import { fetchLiveOdds } from "@/lib/football/service";
import { getQuotaOverview } from "@/lib/football/quota";

export const runtime = "nodejs";

const schema = z.object({ fixtureId: z.number().int().positive() }).strict();

export async function POST(request: Request) {
  return withFootballAdmin(request, async () => {
    const { fixtureId } = schema.parse(await request.json());
    const result = await fetchLiveOdds(fixtureId);
    return { ...result, quota: await getQuotaOverview() };
  });
}

