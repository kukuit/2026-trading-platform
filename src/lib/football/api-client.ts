import { FOOTBALL_DEFAULTS } from "./config";
import { withQuotaReservation, type FootballRequestType } from "./quota";

const API_BASE_URL = "https://v3.football.api-sports.io";

function nonNegativeHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export class ApiFootballError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null = null,
    readonly providerRemaining: number | null = null,
    readonly minuteRemaining: number | null = null,
    readonly dailyLimit: number | null = null,
    readonly minuteLimit: number | null = null,
  ) {
    super(message);
    this.name = "ApiFootballError";
  }
}

function providerErrors(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(
      ([key, message]) => `${key}: ${String(message)}`,
    );
  }
  return typeof value === "string" && value ? [value] : [];
}

function safeErrorMessage(message: string, apiKey: string) {
  return apiKey ? message.split(apiKey).join("[redacted]").slice(0, 4000) : message.slice(0, 4000);
}

export class ApiFootballClient {
  async get(endpoint: string, params: Record<string, string | number>, options: {
    type: FootballRequestType;
    fixtureId?: number;
  }) {
    const apiKey = process.env.APIFOOTBALL_KEY || process.env.API_FOOTBALL_KEY;
    if (!apiKey) throw new ApiFootballError("API_FOOTBALL_KEY is not configured.");

    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const baseUrl = (process.env.APIFOOTBALL_BASE_URL || API_BASE_URL).replace(/\/+$/, "");
    const query = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)]),
    );
    const queryString = query.toString();
    const url = `${baseUrl}${cleanEndpoint}${queryString ? `?${queryString}` : ""}`;
    const loggedEndpoint = `${cleanEndpoint}${queryString ? `?${queryString}` : ""}`;

    const makeRequest = () => withQuotaReservation(
      options.type,
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FOOTBALL_DEFAULTS.requestTimeoutMs);
        let response: Response;

        try {
          response = await fetch(url, {
            method: "GET",
            headers: { "x-apisports-key": apiKey, accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          });
        } catch (error) {
          const message = error instanceof Error && error.name === "AbortError"
            ? `API-Football request timed out after ${FOOTBALL_DEFAULTS.requestTimeoutMs} ms.`
            : error instanceof Error
              ? error.message
              : "Network request failed.";
          throw new ApiFootballError(safeErrorMessage(message, apiKey));
        } finally {
          clearTimeout(timeout);
        }

        const providerRemaining = nonNegativeHeader(response.headers, "x-ratelimit-requests-remaining");
        const dailyLimit = nonNegativeHeader(response.headers, "x-ratelimit-requests-limit");
        const minuteRemaining = nonNegativeHeader(response.headers, "x-ratelimit-remaining");
        const minuteLimit = nonNegativeHeader(response.headers, "x-ratelimit-limit");
        const bodyText = await response.text();
        let payload: unknown = null;
        if (bodyText) {
          try {
            payload = JSON.parse(bodyText);
          } catch {
            throw new ApiFootballError(
              "API-Football returned a non-JSON response.",
              response.status,
              providerRemaining,
              minuteRemaining,
              dailyLimit,
              minuteLimit,
            );
          }
        }

        const envelope = payload && typeof payload === "object"
          ? payload as Record<string, unknown>
          : null;
        const errors = providerErrors(envelope?.errors);
        if (!response.ok || errors.length) {
          const detail = errors.length ? errors.join("; ") : `HTTP ${response.status}`;
          throw new ApiFootballError(
            safeErrorMessage(`API-Football request failed: ${detail}`, apiKey),
            response.status,
            providerRemaining,
            minuteRemaining,
            dailyLimit,
            minuteLimit,
          );
        }

        if (response.status === 204) {
          return { value: { get: cleanEndpoint, errors: [], results: 0, response: [] }, statusCode: response.status, providerRemaining, minuteRemaining, dailyLimit, minuteLimit };
        }
        const isStatusObject = cleanEndpoint === "/status" && envelope?.response !== null &&
          typeof envelope?.response === "object" && !Array.isArray(envelope.response);
        if (!envelope || (!Array.isArray(envelope.response) && !isStatusObject)) {
          throw new ApiFootballError(
            "API-Football response did not contain a response array.",
            response.status,
            providerRemaining,
            minuteRemaining,
            dailyLimit,
            minuteLimit,
          );
        }

        return { value: payload, statusCode: response.status, providerRemaining, minuteRemaining, dailyLimit, minuteLimit };
      },
      { endpoint: loggedEndpoint, requestType: options.type, fixtureId: options.fixtureId ?? null },
    );

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await makeRequest();
      } catch (error) {
        const statusCode = error instanceof ApiFootballError ? error.statusCode : null;
        const retryable = statusCode === 429 || (statusCode !== null && statusCode >= 500);
        if (!retryable || attempt >= 2) throw error;
        const delayMs = statusCode === 429 ? 15_000 * (attempt + 1) : 1_000 * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
}

export const apiFootballClient = new ApiFootballClient();

