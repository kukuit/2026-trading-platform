import { withFootballAdmin } from "@/lib/football/route";
import { getTrackingOdds } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: { id: string } }) {
  const page = Math.max(1, Number(new URL(request.url).searchParams.get("page") ?? 1) || 1);
  return withFootballAdmin(request, async () => {
    const result = await getTrackingOdds(context.params.id, page);
    return result ?? Response.json({ error: "Tracking was not found." }, { status: 404 });
  });
}
