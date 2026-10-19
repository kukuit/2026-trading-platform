import { NextResponse } from "next/server";
import { discoverExternalFixtures } from "@/lib/football/operations";
import { withFootballAdmin } from "@/lib/football/route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode")?.toUpperCase() ?? "LIVE";
  if (mode !== "LIVE" && mode !== "UPCOMING") {
    return NextResponse.json({ error: "Mode must be LIVE or UPCOMING." }, { status: 400 });
  }
  return withFootballAdmin(request, () => discoverExternalFixtures(mode));
}
