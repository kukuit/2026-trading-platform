import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export function footballAdminAuthorized(request: Request) {
  if (process.env.NODE_ENV === "development") return true;

  const expected = process.env.FOOTBALL_ADMIN_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!expected || !provided || expected.length !== provided.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export function unauthorizedResponse() {
  if (!process.env.FOOTBALL_ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "Set FOOTBALL_ADMIN_TOKEN on the server before using Football Collector." },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: "Admin token required." }, { status: 401 });
}

