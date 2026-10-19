import { withFootballAdmin } from "@/lib/football/route";
import { verifyFootballLeagueIds } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withFootballAdmin(request, verifyFootballLeagueIds);
}
