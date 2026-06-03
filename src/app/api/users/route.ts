import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/serializers";
import { appNow } from "@/config/timezone";

const userSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startingBalance: z.coerce.number().positive(),
});

export async function GET() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      description: user.description,
      startingBalance: decimalToNumber(user.startingBalance),
      currentBalance: decimalToNumber(user.currentBalance),
    })),
  });
}

export async function POST(request: Request) {
  const payload = userSchema.parse(await request.json());
  const user = await prisma.user.create({
    data: {
      name: payload.name,
      description: payload.description,
      startingBalance: payload.startingBalance,
      currentBalance: payload.startingBalance,
      createdAt: appNow(),
    },
  });

  return NextResponse.json({ userId: user.id });
}
