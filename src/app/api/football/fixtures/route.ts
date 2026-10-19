import { NextResponse } from "next/server";
import { withFootballAdmin } from "@/lib/football/route";
import { listFixtures } from "@/lib/football/service";
import { queryFixtures } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filter = (url.searchParams.get("filter") ?? "ALL").toUpperCase();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  if (!["ALL", "LIVE", "UPCOMING", "FINISHED", "TEST"].includes(filter)) {
    return NextResponse.json({ error: "Invalid fixture filter." }, { status: 400 });
  }
  const hasAdvancedFilters = ["from", "to", "leagueId", "status", "search"].some((key) => url.searchParams.has(key));
  if (hasAdvancedFilters) {
    const leagueId = url.searchParams.get("leagueId");
    return withFootballAdmin(request, () => queryFixtures({
      filter,
      page,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      leagueId: leagueId && Number.isInteger(Number(leagueId)) ? Number(leagueId) : undefined,
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
    }));
  }
  return withFootballAdmin(request, () => listFixtures(filter, page));
}

