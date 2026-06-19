import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AvatarValidationError, deleteStoredAvatar, saveAvatarFile } from "@/lib/avatarStorage";
import { decimalToNumber } from "@/lib/serializers";
import { hasStrategyInput, normalizeStrategyInput } from "@/lib/strategyInput";
import { appNow } from "@/config/timezone";

const userSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  startingBalance: z.coerce.number().positive(),
  maxCoinCount: z.coerce.number().int().positive().nullable().optional(),
  coinSelectionRule: z.string().trim().nullable().optional(),
  buyRule: z.string().trim().nullable().optional(),
  sellRule: z.string().trim().nullable().optional(),
});

export const runtime = "nodejs";

export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      strategy: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      description: user.description,
      avatar: user.avatar,
      startingBalance: decimalToNumber(user.startingBalance),
      currentBalance: decimalToNumber(user.currentBalance),
      strategyId: user.strategyId,
      status: user.status,
      strategy: user.strategy
        ? {
            id: user.strategy.id,
            note: user.strategy.note,
            maxCoinCount: user.strategy.maxCoinCount,
            coinSelectionRule: user.strategy.coinSelectionRule,
            buyRule: user.strategy.buyRule,
            sellRule: user.strategy.sellRule,
          }
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsedPayload = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Invalid user data. Check the account and strategy fields." },
      { status: 400 },
    );
  }

  const payload = parsedPayload.data;
  let uploadedAvatar: string | null = null;
  try {
    uploadedAvatar = await saveAvatarFile(formData.get("avatar"));
    const user = await prisma.$transaction(async (tx) => {
      const strategy = hasStrategyInput(payload)
        ? await tx.strategy.create({
            data: normalizeStrategyInput(payload),
          })
        : null;

      return tx.user.create({
        data: {
          name: payload.name,
          description: payload.description,
          avatar: uploadedAvatar,
          startingBalance: payload.startingBalance,
          currentBalance: payload.startingBalance,
          status: 1,
          strategyId: strategy?.id ?? null,
          createdAt: appNow(),
        },
      });
    });

    return NextResponse.json({ userId: user.id });
  } catch (error) {
    await deleteStoredAvatar(uploadedAvatar);

    if (error instanceof AvatarValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
