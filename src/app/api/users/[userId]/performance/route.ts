import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serializers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
) {
  const points = await prisma.userDailyAsset.findMany({
    where: { userId: params.userId },
    orderBy: { snapshotDate: "asc" },
  });

  const values = points.map((point) => decimalToNumber(point.totalValue));
  const currentValue = values.at(-1) ?? 0;
  const firstValue = values[0] ?? currentValue;
  const totalReturn = firstValue > 0 ? ((currentValue - firstValue) / firstValue) * 100 : 0;

  return NextResponse.json({
    points: points.map((point) => ({
      date: point.snapshotDate.toISOString().slice(0, 10),
      cashBalance: decimalToNumber(point.cashBalance),
      assetValue: decimalToNumber(point.assetValue),
      totalValue: decimalToNumber(point.totalValue),
    })),
    stats: {
      totalReturn,
      currentValue,
      highestValue: values.length ? Math.max(...values) : 0,
      lowestValue: values.length ? Math.min(...values) : 0,
    },
  });
}
