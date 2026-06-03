import { NextResponse } from "next/server";
import { Prisma, TradeType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serializers";
import { appNow } from "@/config/timezone";

const tradeSchema = z.object({
  userId: z.string().min(1),
  coinId: z.coerce.number().int().positive(),
  type: z.nativeEnum(TradeType),
  amountUsd: z.coerce.number().positive().optional(),
  quantity: z.coerce.number().positive().optional(),
});

export async function POST(request: Request) {
  const payload = tradeSchema.parse(await request.json());
  const latest = await prisma.coinMarketData.findFirst({
    where: { coinId: payload.coinId },
    orderBy: [{ snapshotDate: "desc" }, { id: "desc" }],
  });
  if (!latest) {
    return NextResponse.json({ error: "Coin has no market price" }, { status: 400 });
  }

  const priceUsd = decimalToNumber(latest.priceUsd);
  const now = appNow();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new Error("USER_NOT_FOUND");

    const cash = decimalToNumber(user.currentBalance);

    if (payload.type === "BUY") {
      const amountUsd = payload.amountUsd ?? 0;
      if (amountUsd <= 0) throw new Error("BUY_AMOUNT_REQUIRED");
      if (cash < amountUsd) throw new Error("INSUFFICIENT_CASH");

      const quantity = amountUsd / priceUsd;
      const existing = await tx.holding.findUnique({
        where: { userId_coinId: { userId: payload.userId, coinId: payload.coinId } },
      });

      if (existing) {
        const existingQuantity = decimalToNumber(existing.quantity);
        const existingAvg = decimalToNumber(existing.avgPrice);
        const nextQuantity = existingQuantity + quantity;
        const nextAvg = (existingQuantity * existingAvg + amountUsd) / nextQuantity;
        await tx.holding.update({
          where: { id: existing.id },
          data: { quantity: nextQuantity, avgPrice: nextAvg, updatedAt: now },
        });
      } else {
        await tx.holding.create({
          data: {
            userId: payload.userId,
            coinId: payload.coinId,
            quantity,
            avgPrice: priceUsd,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      await tx.user.update({
        where: { id: payload.userId },
        data: { currentBalance: new Prisma.Decimal(cash - amountUsd) },
      });

      return tx.trade.create({
        data: {
          userId: payload.userId,
          coinId: payload.coinId,
          type: "BUY",
          quantity,
          priceUsd,
          totalAmount: amountUsd,
          createdAt: now,
        },
      });
    }

    const sellQuantity = payload.quantity ?? 0;
    if (sellQuantity <= 0) throw new Error("SELL_QUANTITY_REQUIRED");

    const holding = await tx.holding.findUnique({
      where: { userId_coinId: { userId: payload.userId, coinId: payload.coinId } },
    });
    if (!holding || decimalToNumber(holding.quantity) < sellQuantity) {
      throw new Error("INSUFFICIENT_HOLDING");
    }

    const totalAmount = sellQuantity * priceUsd;
    const remainingQuantity = decimalToNumber(holding.quantity) - sellQuantity;

    if (remainingQuantity <= 0.00000001) {
      await tx.holding.delete({ where: { id: holding.id } });
    } else {
      await tx.holding.update({
        where: { id: holding.id },
        data: { quantity: remainingQuantity, updatedAt: now },
      });
    }

    await tx.user.update({
      where: { id: payload.userId },
      data: { currentBalance: new Prisma.Decimal(cash + totalAmount) },
    });

    return tx.trade.create({
      data: {
        userId: payload.userId,
        coinId: payload.coinId,
        type: "SELL",
        quantity: sellQuantity,
        priceUsd,
        totalAmount,
        createdAt: now,
      },
    });
  });

  return NextResponse.json({ tradeId: result.id });
}
