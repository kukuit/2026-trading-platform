import { NextResponse } from "next/server";
import { withFootballAdmin } from "@/lib/football/route";
import { getFixtureDetails } from "@/lib/football/service";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { id: string } }) {
  return withFootballAdmin(request, async () => {
    const fixture = await getFixtureDetails(context.params.id);
    if (!fixture) return NextResponse.json({ error: "Fixture not found." }, { status: 404 });
    return fixture;
  });
}

