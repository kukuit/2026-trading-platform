import { z } from "zod";
import { withFootballAdmin } from "@/lib/football/route";
import { startFixtureTracking } from "@/lib/football/operations";

export const runtime = "nodejs";

const schema = z.object({ providerFixtureId: z.number().int().positive(), isTest: z.boolean().optional() }).strict();

export async function POST(request: Request) {
  return withFootballAdmin(request, async () => startFixtureTracking(schema.parse(await request.json())));
}
