import { z } from "zod";
import { withFootballAdmin } from "@/lib/football/route";
import { setFootballLeagueEnabled } from "@/lib/football/operations";

export const runtime = "nodejs";

const bodySchema = z.object({ isEnabled: z.boolean() }).strict();

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return withFootballAdmin(request, async () => {
    const id = Number(context.params.id);
    if (!Number.isInteger(id)) throw new Error("League ID must be an integer.");
    const body = bodySchema.parse(await request.json());
    return setFootballLeagueEnabled(id, body.isEnabled);
  });
}
