import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toDateOnly } from "@/lib/dates";
import { getAssetValue } from "@/lib/portfolio";
import { decimalToNumber } from "@/lib/serializers";
import { appNow } from "@/config/timezone";

const snapshotSchema = z.object({
  snapshotDate: z.string().min(10),
});

export async function POST(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const payload = snapshotSchema.parse(await request.json());
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const cashBalance = decimalToNumber(user.currentBalance);
  const assetValue = await getAssetValue(user.id);
  const totalValue = cashBalance + assetValue;
  const snapshotDate = toDateOnly(payload.snapshotDate);
  const now = appNow();

  const snapshot = await prisma.userDailyAsset.upsert({
    where: {
      userId_snapshotDate: {
        userId: user.id,
        snapshotDate,
      },
    },
    update: { cashBalance, assetValue, totalValue },
    create: { userId: user.id, snapshotDate, cashBalance, assetValue, totalValue, createdAt: now },
  });

  return NextResponse.json({ snapshotId: snapshot.id });
}
