import { withFootballAdmin } from "@/lib/football/route";
import { cancelFixtureTracking } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: { id: string } }) {
  return withFootballAdmin(request, async () => {
    const result = await cancelFixtureTracking(context.params.id);
    return result ?? new Response(JSON.stringify({ error: "Tracking was not found." }), { status: 404, headers: { "Content-Type": "application/json" } });
  });
}
