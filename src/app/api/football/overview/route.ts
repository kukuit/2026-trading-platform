import { withFootballAdmin } from "@/lib/football/route";
import { getOverview } from "@/lib/football/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withFootballAdmin(request, getOverview);
}

