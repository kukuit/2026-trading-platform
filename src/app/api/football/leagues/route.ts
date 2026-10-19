import { withFootballAdmin } from "@/lib/football/route";
import { listFootballLeagues } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withFootballAdmin(request, listFootballLeagues);
}
