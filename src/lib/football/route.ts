import { NextResponse } from "next/server";
import { footballAdminAuthorized, unauthorizedResponse } from "./auth";
import { ApiFootballError } from "./api-client";
import { QuotaExceededError } from "./quota";

export async function withFootballAdmin(
  request: Request,
  action: () => Promise<unknown>,
) {
  if (!footballAdminAuthorized(request)) return unauthorizedResponse();

  try {
    const result = await action();
    return result instanceof Response ? result : NextResponse.json(result);
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 429 });
    }
    if (error instanceof ApiFootballError) {
      return NextResponse.json(
        {
          error: error.message,
          providerStatus: error.statusCode,
          quotaRemaining: error.providerRemaining,
        },
        { status: error.statusCode === 429 ? 429 : 502 },
      );
    }
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Request validation failed." }, { status: 400 });
    }
    return NextResponse.json({ error: "Football Collector request failed." }, { status: 500 });
  }
}

