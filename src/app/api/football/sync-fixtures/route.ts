import { withFootballAdmin } from "@/lib/football/route";
import { syncEnabledLeagueFixtures } from "@/lib/football/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withFootballAdmin(request, async () => {
    return syncEnabledLeagueFixtures();
  });
}

