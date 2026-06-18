import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hasStrategyInput, normalizeStrategyInput } from "@/lib/strategyInput";

const userSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  maxCoinCount: z.coerce.number().int().positive().nullable().optional(),
  coinSelectionRule: z.string().trim().nullable().optional(),
  buyRule: z.string().trim().nullable().optional(),
  sellRule: z.string().trim().nullable().optional(),
});

const statusSchema = z.object({
  status: z.union([z.literal(0), z.literal(1)]),
});

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const parsedPayload = userSchema.safeParse(await request.json());
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: "Invalid user data. Check the account and strategy fields." },
      { status: 400 },
    );
  }

  const payload = parsedPayload.data;
  const strategyData = normalizeStrategyInput(payload);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id: params.userId },
        select: { strategyId: true },
      });

      if (!existingUser) throw new Error("USER_NOT_FOUND");

      let strategyId = existingUser.strategyId;
      if (strategyId) {
        await tx.strategy.update({
          where: { id: strategyId },
          data: strategyData,
        });
      } else if (hasStrategyInput(payload)) {
        const strategy = await tx.strategy.create({
          data: strategyData,
        });
        strategyId = strategy.id;
      }

      return tx.user.update({
        where: { id: params.userId },
        data: {
          name: payload.name,
          description: payload.description,
          strategyId,
        },
      });
    });

    return NextResponse.json({ userId: user.id });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    throw error;
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } },
) {
  const parsedPayload = statusSchema.safeParse(await request.json());
  if (!parsedPayload.success) {
    return NextResponse.json({ error: "Invalid user status." }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id: params.userId },
      data: { status: parsedPayload.data.status },
      select: { id: true, status: true },
    });

    return NextResponse.json({ userId: user.id, status: user.status });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    throw error;
  }
}
