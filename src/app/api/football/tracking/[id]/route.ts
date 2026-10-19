import { withFootballAdmin } from "@/lib/football/route";
import { getTrackingOdds } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { id: string } }) {
  return withFootballAdmin(request, async () => {
    const result = await getTrackingOdds(context.params.id);
    return result ?? new Response(JSON.stringify({ error: "Tracking was not found." }), { status: 404, headers: { "Content-Type": "application/json" } });
  });
}
