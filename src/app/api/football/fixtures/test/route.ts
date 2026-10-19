import { NextResponse } from "next/server";
import { withFootballAdmin } from "@/lib/football/route";
import { findTestFixtures } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const live = url.searchParams.get("live") === "true";
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  for (const date of [from, to]) {
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Date must use YYYY-MM-DD." }, { status: 400 });
  }
  return withFootballAdmin(request, () => findTestFixtures({ from, to, search, status, live }));
}
