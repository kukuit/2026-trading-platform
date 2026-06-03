import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  return NextResponse.json({ portfolio: await getPortfolio(params.userId) });
}
