import { withFootballAdmin } from "@/lib/football/route";
import { listMissingResults } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const league = query.get("leagueId");
  const page = Math.max(1, Number(query.get("page") ?? 1) || 1);
  return withFootballAdmin(request, () => listMissingResults({
    leagueId: league && Number.isInteger(Number(league)) ? Number(league) : undefined,
    from: query.get("from") ?? undefined,
    to: query.get("to") ?? undefined,
    page,
  }));
}
