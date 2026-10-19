import { withFootballAdmin } from "@/lib/football/route";
import { findLiveFixtures } from "@/lib/football/service";
import { getQuotaOverview } from "@/lib/football/quota";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withFootballAdmin(request, async () => ({
    fixtures: await findLiveFixtures(),
    quota: await getQuotaOverview(),
  }));
}

