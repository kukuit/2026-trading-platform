import { NextResponse } from "next/server";
import { withFootballAdmin } from "@/lib/football/route";
import { getFixtureHistory } from "@/lib/football/service";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { id: string } }) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const test = url.searchParams.get("test");
  const testMode = test === "true" ? true : test === "false" ? false : undefined;
  return withFootballAdmin(request, async () => {
    const history = await getFixtureHistory(context.params.id, page, testMode);
    if (!history) return NextResponse.json({ error: "Fixture not found." }, { status: 404 });
    return history;
  });
}
