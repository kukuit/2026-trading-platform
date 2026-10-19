import { prisma } from "../prisma";
import { FOOTBALL_DEFAULTS, getUtcDate, utcDateKey } from "./config";
import { providerMinuteQuotaExhausted } from "./collection-rules";

export type FootballRequestType = "ODDS" | "RESERVED";

export class QuotaExceededError extends Error {
  readonly code = "FOOTBALL_QUOTA_EXHAUSTED";
  constructor(message = "Football API request budget is exhausted for today (UTC).") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export type RequestLogInput = {
  endpoint: string;
  requestType: FootballRequestType;
  fixtureId?: number | null;
  requestedAt: Date;
  statusCode: number | null;
  success: boolean;
  durationMs: number;
  dailyQuotaLimit: number | null;
  dailyQuotaRemaining: number | null;
  minuteQuotaLimit: number | null;
  minuteQuotaRemaining: number | null;
  errorMessage: string | null;
};

async function reserveRequest(type: FootballRequestType) {
  const now = new Date();
  const utcDate = getUtcDate(now);

  await prisma.$transaction(async (transaction) => {
    const job = await transaction.footballCollectorJob.findUnique({ where: { jobName: "production" } });
    const dailyTotalLimit = job?.dailyTotalLimit ?? FOOTBALL_DEFAULTS.dailyTotalLimit;
    const dailyOddsBudget = job?.dailyOddsBudget ?? FOOTBALL_DEFAULTS.dailyOddsBudget;
    const dailyReservedBudget = job?.dailyReservedBudget ?? FOOTBALL_DEFAULTS.dailyReservedBudget;
    await transaction.footballQuotaDay.upsert({
      where: { utcDate }, update: {}, create: { utcDate, updatedAt: now },
    });

    const currentQuota = await transaction.footballQuotaDay.findUnique({ where: { utcDate } });
    const minuteWindowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
    if (providerMinuteQuotaExhausted({
      remaining: currentQuota?.providerMinuteRemaining ?? null,
      reportedAt: currentQuota?.providerReportedAt ?? null,
      now,
    })) {
      throw new QuotaExceededError("API-Football's reported per-minute request limit is exhausted.");
    }
    if (currentQuota?.providerMinuteLimit !== null && currentQuota?.providerMinuteLimit !== undefined) {
      await transaction.footballQuotaDay.updateMany({
        where: {
          utcDate,
          OR: [
            { providerMinuteWindowStart: null },
            { providerMinuteWindowStart: { not: minuteWindowStart } },
          ],
        },
        data: { providerMinuteWindowStart: minuteWindowStart, providerMinuteReserved: 0 },
      });
      const minuteReserved = await transaction.footballQuotaDay.updateMany({
        where: {
          utcDate,
          providerMinuteWindowStart: minuteWindowStart,
          providerMinuteReserved: { lt: currentQuota.providerMinuteLimit },
        },
        data: { providerMinuteReserved: { increment: 1 }, updatedAt: now },
      });
      if (minuteReserved.count !== 1) {
        throw new QuotaExceededError("API-Football's reported per-minute request limit is exhausted.");
      }
    }

    const withinTypeBudget = type === "ODDS"
      ? { oddsUsed: { lt: dailyOddsBudget } }
      : { reservedUsed: { lt: dailyReservedBudget } };
    const reserved = await transaction.footballQuotaDay.updateMany({
      where: {
        utcDate,
        totalUsed: { lt: dailyTotalLimit },
        ...withinTypeBudget,
        OR: [{ providerRemaining: null }, { providerRemaining: { gt: 0 } }],
      },
      data: {
        totalUsed: { increment: 1 },
        ...(type === "ODDS" ? { oddsUsed: { increment: 1 } } : { reservedUsed: { increment: 1 } }),
        updatedAt: now,
      },
    });
    if (reserved.count !== 1) throw new QuotaExceededError();
  });

  return { utcDate, remaining: await getQuotaOverview(now) };
}

export async function getQuotaOverview(now = new Date()) {
  const utcDate = getUtcDate(now);
  const [row, job] = await Promise.all([
    prisma.footballQuotaDay.findUnique({ where: { utcDate } }),
    prisma.footballCollectorJob.findUnique({ where: { jobName: "production" } }),
  ]);
  const totalLimit = job?.dailyTotalLimit ?? FOOTBALL_DEFAULTS.dailyTotalLimit;
  const oddsBudget = job?.dailyOddsBudget ?? FOOTBALL_DEFAULTS.dailyOddsBudget;
  const reservedBudget = job?.dailyReservedBudget ?? FOOTBALL_DEFAULTS.dailyReservedBudget;
  const totalUsed = row?.totalUsed ?? 0;
  const oddsUsed = row?.oddsUsed ?? 0;
  const reservedUsed = row?.reservedUsed ?? 0;
  const internalRemaining = Math.max(0, totalLimit - totalUsed);
  const providerRemaining = row?.providerRemaining ?? null;
  const minuteReportIsFresh = Boolean(row?.providerReportedAt && now.getTime() - row.providerReportedAt.getTime() < 60_000);

  return {
    date: utcDateKey(now),
    totalLimit,
    totalUsed,
    remaining: providerRemaining === null ? internalRemaining : Math.min(internalRemaining, providerRemaining),
    oddsBudget,
    oddsUsed,
    oddsRemaining: Math.max(0, oddsBudget - oddsUsed),
    reservedBudget,
    reservedUsed,
    reservedRemaining: Math.max(0, reservedBudget - reservedUsed),
    providerRemaining,
    providerDailyLimit: row?.providerDailyLimit ?? null,
    providerMinuteLimit: row?.providerMinuteLimit ?? null,
    providerMinuteRemaining: minuteReportIsFresh ? row?.providerMinuteRemaining ?? null : null,
    providerReportedAt: row?.providerReportedAt?.toISOString() ?? null,
    resetAt: new Date(utcDate.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    resetTimezone: FOOTBALL_DEFAULTS.quotaResetTimezone,
  };
}

export async function recordProviderQuota(utcDate: Date, input: {
  dailyRemaining: number | null;
  dailyLimit: number | null;
  minuteRemaining: number | null;
  minuteLimit: number | null;
}) {
  const valid = (value: number | null) => value !== null && Number.isInteger(value) && value >= 0 ? value : undefined;
  if (![input.dailyRemaining, input.dailyLimit, input.minuteRemaining, input.minuteLimit].some((value) => valid(value) !== undefined)) return;
  const now = new Date();
  await prisma.footballQuotaDay.update({
    where: { utcDate },
    data: {
      providerRemaining: valid(input.dailyRemaining),
      providerDailyLimit: valid(input.dailyLimit),
      providerMinuteRemaining: valid(input.minuteRemaining),
      providerMinuteLimit: valid(input.minuteLimit),
      providerReportedAt: now,
      updatedAt: now,
    },
  });
}

function errorNumber(error: unknown, key: string) {
  if (error && typeof error === "object" && key in error) {
    const value = (error as Record<string, unknown>)[key];
    return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
  }
  return null;
}

export async function writeRequestLog(input: RequestLogInput) {
  await prisma.footballApiRequestLog.create({ data: input });
}

export async function withQuotaReservation<T>(
  type: FootballRequestType,
  operation: (reservation: Awaited<ReturnType<typeof reserveRequest>>) => Promise<{
    value: T;
    statusCode: number | null;
    providerRemaining: number | null;
    minuteRemaining: number | null;
    dailyLimit: number | null;
    minuteLimit: number | null;
  }>,
  log: Omit<RequestLogInput, "statusCode" | "success" | "durationMs" | "dailyQuotaLimit" | "dailyQuotaRemaining" | "minuteQuotaLimit" | "minuteQuotaRemaining" | "errorMessage" | "requestedAt">,
) {
  const reservation = await reserveRequest(type);
  const requestedAt = new Date();
  const startedAt = Date.now();
  try {
    const response = await operation(reservation);
    await recordProviderQuota(reservation.utcDate, {
      dailyRemaining: response.providerRemaining,
      dailyLimit: response.dailyLimit,
      minuteRemaining: response.minuteRemaining,
      minuteLimit: response.minuteLimit,
    });
    await writeRequestLog({
      ...log,
      requestType: type,
      requestedAt,
      statusCode: response.statusCode,
      success: true,
      durationMs: Date.now() - startedAt,
      dailyQuotaLimit: response.dailyLimit,
      dailyQuotaRemaining: response.providerRemaining,
      minuteQuotaLimit: response.minuteLimit,
      minuteQuotaRemaining: response.minuteRemaining,
      errorMessage: null,
    });
    return response.value;
  } catch (error) {
    const providerRemaining = errorNumber(error, "providerRemaining");
    const minuteRemaining = errorNumber(error, "minuteRemaining");
    const dailyLimit = errorNumber(error, "dailyLimit");
    const minuteLimit = errorNumber(error, "minuteLimit");
    await recordProviderQuota(reservation.utcDate, {
      dailyRemaining: providerRemaining,
      dailyLimit,
      minuteRemaining,
      minuteLimit,
    });
    await writeRequestLog({
      ...log,
      requestType: type,
      requestedAt,
      statusCode: errorNumber(error, "statusCode"),
      success: false,
      durationMs: Date.now() - startedAt,
      dailyQuotaLimit: dailyLimit,
      dailyQuotaRemaining: providerRemaining,
      minuteQuotaLimit: minuteLimit,
      minuteQuotaRemaining: minuteRemaining,
      errorMessage: error instanceof Error ? error.message.slice(0, 4000) : "Unknown provider error",
    });
    throw error;
  }
}
