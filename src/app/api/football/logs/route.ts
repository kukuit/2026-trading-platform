import { withFootballAdmin } from "@/lib/football/route";
import { listCollectorLogs } from "@/lib/football/operations";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  return withFootballAdmin(request, () => listCollectorLogs(page));
}

