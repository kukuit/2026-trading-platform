import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAssetValue } from "@/lib/portfolio";
import { decimalToNumber } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const currentBalance = decimalToNumber(user.currentBalance);
  const startingBalance = decimalToNumber(user.startingBalance);
  const assetValue = await getAssetValue(user.id);
  const totalValue = currentBalance + assetValue;
  const pnl = totalValue - startingBalance;
  const pnlPct = startingBalance > 0 ? (pnl / startingBalance) * 100 : 0;

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      description: user.description,
      startingBalance,
      currentBalance,
    },
    totals: {
      currentBalance,
      assetValue,
      totalValue,
      pnl,
      pnlPct,
    },
  });
}
