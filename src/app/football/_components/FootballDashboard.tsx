"use client";

import Link from "next/link";
import { FormEvent, Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Eye,
  FileCheck2,
  History,
  KeyRound,
  LoaderCircle,
  Moon,
  RefreshCw,
  Search,
  ServerCog,
  Settings2,
  ShieldCheck,
  Sun,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Metric } from "@/app/_page/ui";
import { FOOTBALL_LEAGUES, getFootballLeague } from "@/lib/football/leagues";
import { parseStructuredLiveMarkets } from "@/lib/football/markets";
import { FOOTBALL_TAB_PATHS, type FootballTab } from "../routes";

type Fixture = {
  id?: string | null;
  providerFixtureId: number;
  providerLeagueId: number;
  season: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  kickoffAt: string;
  status: string;
  elapsedMinute: number | null;
  elapsedExtraTime?: number;
  leagueName?: string;
  leagueCountry?: string | null;
  snapshotCount?: number;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreHt?: number | null;
  awayScoreHt?: number | null;
  homeScoreFt?: number | null;
  awayScoreFt?: number | null;
  homeCornerKicksHt?: number | null;
  awayCornerKicksHt?: number | null;
  homeCornerKicksFt?: number | null;
  awayCornerKicksFt?: number | null;
  resultStatus?: string;
  liveTracking?: { id: string; status: string; isEnabled: boolean } | null;
  isTestFixture?: boolean;
};

type OddsValue = {
  providerBetId: number;
  betName: string;
  bookmakerId: number | null;
  bookmakerName: string | null;
  selectionName: string;
  oddValue: string;
  oddNumeric: string | null;
  main: boolean | null;
  suspended: boolean | null;
  blocked: boolean | null;
  stopped: boolean | null;
  finished: boolean | null;
  extraData: Record<string, unknown>;
};

type Overview = {
  collectors: Array<{
    id: string;
    top: number;
    leagueId: number;
    name: string;
    country: string;
    shortName: string;
    enabled: boolean;
    collectionEnabled?: boolean;
    season: number;
    status: string;
    lastFixtureSyncAt: string | null;
    nextRunAt: string | null;
    lastError: string | null;
  }>;
  collector: {
    enabled: boolean;
    workerOnline: boolean;
    mode: string;
    leagueId: number;
    season: number;
    status: string;
    pollingIntervalSeconds: number;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    nextRunAt: string | null;
    lastFixtureSyncAt: string | null;
    lastError: string | null;
    enabledLeagueCount: number;
    trackingRecordingCount?: number;
    trackingWaitingCount?: number;
    quotaStatus?: string;
    heartbeatAt?: string | null;
  };
  quota: {
    date: string;
    totalLimit: number;
    totalUsed: number;
    remaining: number;
    oddsBudget: number;
    oddsUsed: number;
    oddsRemaining: number;
    reservedBudget: number;
    reservedUsed: number;
    reservedRemaining: number;
    providerRemaining: number | null;
    resetAt: string;
    resetTimezone: string;
  };
  requestsToday: number;
  snapshotsSaved: number;
  liveFixtures: Array<Fixture & { snapshotCount: number }>;
  serverConfigured: boolean;
};

type FixtureRow = Fixture & {
  id: string;
  snapshotCount: number;
  lastOddsAt: string | null;
  lastSyncedAt: string | null;
  latestAhFtLine: string | number | null;
  latestAhFtHomePrice: string | number | null;
  latestAhFtAwayPrice: string | number | null;
  latestHomeCornerKicks?: number | null;
  latestAwayCornerKicks?: number | null;
};

type FixtureLeagueGroup = {
  leagueId: number;
  label: string;
  fixtures: FixtureRow[];
};

type SettlementStatus = "WIN" | "LOSS" | "PUSH" | "HALF_WIN" | "HALF_LOSS";
type SnapshotSettlement = Partial<Record<
  | "ahHtHome" | "ahHtAway" | "ouHtOver" | "ouHtUnder"
  | "ahFtHome" | "ahFtAway" | "ouFtOver" | "ouFtUnder"
  | "cornerAhHtHome" | "cornerAhHtAway" | "cornerOuHtOver" | "cornerOuHtUnder"
  | "cornerAhFtHome" | "cornerAhFtAway" | "cornerOuFtOver" | "cornerOuFtUnder",
  SettlementStatus
>>;

type FootballAnalyticsGroup = {
  key: string;
  bucketStart: number;
  bucketEnd: number;
  score: string;
  corners: string | null;
  marketKey: string;
  marketLabel: string;
  selection: string;
  line: string;
  priceTolerance: number;
  matchCount: number;
  outcomes: Record<SettlementStatus, number>;
  winRate: number | null;
  matches: Array<{
    fixtureId: string;
    providerFixtureId: number;
    homeTeamName: string;
    awayTeamName: string;
    kickoffAt: string;
    actualMinute: number;
    score: string;
    corners: string | null;
    finalScore: string;
    finalCorners: string | null;
    firstPrice: string;
    secondPrice: string;
    outcome: SettlementStatus;
  }>;
};

type FootballAnalyticsResponse = {
  bucketSize: number;
  priceTolerance: number;
  snapshotCount: number;
  groupCount: number;
  groups: FootballAnalyticsGroup[];
};

type FixtureDetails = FixtureRow & {
  oddsSnapshots: Array<{
    id: string;
    capturedAt: string;
    isTest: boolean;
    sourceType: "LIVE" | "PREMATCH";
    slotKey: string | null;
    targetMinute: number | null;
    actualMinute: number | null;
    period: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homeCornerKicks: number | null;
    awayCornerKicks: number | null;
    fixtureStatus: string | null;
    dataStatus: string | null;
    ahHtLine: string | number | null;
    ahHtHomePrice: string | number | null;
    ahHtAwayPrice: string | number | null;
    ahFtLine: string | number | null;
    ahFtHomePrice: string | number | null;
    ahFtAwayPrice: string | number | null;
    ouHtLine: string | number | null;
    ouHtOverPrice: string | number | null;
    ouHtUnderPrice: string | number | null;
    ouFtLine: string | number | null;
    ouFtOverPrice: string | number | null;
    ouFtUnderPrice: string | number | null;
    cornerAhHtLine: string | number | null;
    cornerAhHtHomePrice: string | number | null;
    cornerAhHtAwayPrice: string | number | null;
    cornerOuHtLine: string | number | null;
    cornerOuHtOverPrice: string | number | null;
    cornerOuHtUnderPrice: string | number | null;
    cornerAhFtLine: string | number | null;
    cornerAhFtHomePrice: string | number | null;
    cornerAhFtAwayPrice: string | number | null;
    cornerOuFtLine: string | number | null;
    cornerOuFtOverPrice: string | number | null;
    cornerOuFtUnderPrice: string | number | null;
    settlementData: SnapshotSettlement | null;
  }>;
};

type Settings = {
  leagues: Array<{
    top: number;
    leagueId: number;
    name: string;
    country: string;
    shortName: string;
    enabled: boolean;
    status: string;
    lastFixtureSyncAt: string | null;
    lastError: string | null;
  }>;
  season: number;
  pollingIntervalSeconds: number;
  dailyTotalLimit: number;
  dailyOddsBudget: number;
  dailyReservedBudget: number;
  livePollingIntervalSeconds: number;
  quotaResetTimezone: string;
  mode: string;
  isCollectorEnabled?: boolean;
  oddsIntervalMinutes?: number;
  fixtureSyncIntervalHours?: number;
  statusCheckIntervalSeconds?: number;
  preferredBookmakerId?: number | null;
};

type FootballSettingsDraft = {
  leagueIds: number[];
  season: number;
  pollingIntervalSeconds: number;
  dailyTotalLimit: number;
  dailyOddsBudget: number;
  dailyReservedBudget: number;
  isCollectorEnabled: boolean;
  oddsIntervalMinutes: number;
  fixtureSyncIntervalHours: number;
  statusCheckIntervalSeconds: number;
  preferredBookmakerId: number | null;
};

type SystemCheck = Record<string, unknown> & { status?: string; message?: string };

type TrackingRow = {
  id: string;
  status: string;
  lastError: string | null;
  snapshotCount: number;
  missingSnapshotCount: number;
  latestOddsAt: string | null;
  latestHomeCornerKicks: number | null;
  latestAwayCornerKicks: number | null;
  lastSlot: { slotKey: string; actualMinute: number | null; status: string; capturedAt: string | null } | null;
  fixture: FixtureRow & { league?: { key: string; shortName: string } | null };
};

type MissingResultRow = FixtureRow & {
  resultStatus: string;
  homeScoreHt: number | null;
  awayScoreHt: number | null;
  homeScoreFt: number | null;
  awayScoreFt: number | null;
};

type ApiError = Error & { status?: number };

async function requestJson<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error ?? `Request failed (${response.status}).`) as ApiError;
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
    timeZone: options?.timeZone ?? "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatFixtureDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
  return `${datePart} ${timePart}`;
}

function formatTrackingMinute(fixture: Fixture) {
  const inPlayStatuses = ["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE", "SUSP"];
  if (!inPlayStatuses.includes(fixture.status.toUpperCase()) || fixture.elapsedMinute === null) return null;
  return `${fixture.elapsedMinute}'${fixture.elapsedExtraTime ? ` +${fixture.elapsedExtraTime}` : ""}`;
}

function formatAsianHandicapLine(value: string | number | null) {
  if (value === null) return "—";
  const line = Number(value);
  if (!Number.isFinite(line)) return String(value);

  const sign = line < 0 ? "-" : line > 0 ? "+" : "";
  const absolute = Math.abs(line);
  const whole = Math.floor(absolute + 1e-8);
  const fraction = absolute - whole;
  const quarter = [
    [0.25, "1/4"],
    [0.5, "1/2"],
    [0.75, "3/4"],
  ] as const;
  const fractionLabel = quarter.find(([amount]) => Math.abs(fraction - amount) < 1e-6)?.[1];
  if (fractionLabel) return `${sign}${whole}:${fractionLabel}`;
  return `${sign}${Number(absolute.toFixed(2))}`;
}

function formatOddsPrice(value: string | number | null) {
  if (value === null) return "—";
  const price = Number(value);
  return Number.isFinite(price) ? price.toFixed(3) : String(value);
}

function groupFixturesByLeague(fixtures: FixtureRow[]): FixtureLeagueGroup[] {
  const groups = new Map<number, FixtureRow[]>();
  for (const fixture of fixtures) {
    const rows = groups.get(fixture.providerLeagueId) ?? [];
    rows.push(fixture);
    groups.set(fixture.providerLeagueId, rows);
  }

  return Array.from(groups, ([leagueId, rows]) => {
    const league = getFootballLeague(leagueId);
    const sortedFixtures = rows.sort((left, right) => Date.parse(left.kickoffAt) - Date.parse(right.kickoffAt));
    return {
      leagueId,
      label: league ? `${league.shortName} · ${league.country}` : `Giải #${leagueId}`,
      fixtures: sortedFixtures,
    };
  }).sort((left, right) => Date.parse(left.fixtures[0].kickoffAt) - Date.parse(right.fixtures[0].kickoffAt));
}

function isUpcomingBeforeTomorrowMorning(value: string) {
  const kickoffAt = new Date(value).getTime();
  const now = new Date();
  if (!Number.isFinite(kickoffAt) || kickoffAt <= now.getTime()) return false;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((value) => value.type === type)?.value);
  const tomorrowSixAm = Date.UTC(part("year"), part("month") - 1, part("day"), 23);
  return kickoffAt <= tomorrowSixAm;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    NS: "Sắp diễn ra",
    TBD: "Chưa xác định",
    "1H": "Hiệp 1",
    HT: "Nghỉ giữa hiệp",
    "2H": "Hiệp 2",
    ET: "Hiệp phụ",
    BT: "Nghỉ hiệp phụ",
    P: "Luân lưu",
    INT: "Tạm dừng",
    SUSP: "Đình chỉ",
    LIVE: "Đang đá",
    FT: "Kết thúc",
    AET: "Hết hiệp phụ",
    PEN: "Kết thúc luân lưu",
    PST: "Hoãn",
    CANC: "Hủy",
    ABD: "Dừng trận",
    AWD: "Xử thắng",
    WO: "Bỏ cuộc",
  };
  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (["1H", "2H", "ET", "P", "LIVE"].includes(status)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["HT", "BT", "INT", "SUSP"].includes(status)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["FT", "AET", "PEN"].includes(status)) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (["PST", "CANC", "ABD", "AWD", "WO"].includes(status)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function TeamMark({ logo, name }: { logo: string | null; name: string }) {
  if (!logo) {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
        {name.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  // Provider logos are public image assets; a regular img avoids requiring an image-host allowlist.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="h-8 w-8 shrink-0 object-contain" src={logo} alt="" />;
}

function FixtureTeams({ fixture }: { fixture: Fixture }) {
  const league = getFootballLeague(fixture.providerLeagueId);
  return (
    <div className="flex min-w-52 flex-col gap-2">
      <span className="w-fit rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
        {league?.shortName ?? `League ${fixture.providerLeagueId}`}
      </span>
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <TeamMark logo={fixture.homeTeamLogo} name={fixture.homeTeamName} />
        <span className="truncate">{fixture.homeTeamName}</span>
      </span>
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <TeamMark logo={fixture.awayTeamLogo} name={fixture.awayTeamName} />
        <span className="truncate">{fixture.awayTeamName}</span>
      </span>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Tổng quan", icon: Activity },
  { id: "fixtures", label: "Trận đấu", icon: Clock3 },
  { id: "radar", label: "Live Radar", icon: Activity },
  { id: "live", label: "Live Recording", icon: Wifi },
  { id: "history", label: "Lịch sử odds", icon: History },
  { id: "analytics", label: "Phân tích", icon: BarChart3 },
  { id: "results", label: "Kết quả thiếu", icon: FileCheck2 },
  { id: "system", label: "System Status", icon: ServerCog },
  { id: "settings", label: "Cấu hình", icon: Settings2 },
  { id: "logs", label: "Nhật ký", icon: Database },
] as const;

type Tab = FootballTab;

function vietnamDateInput(offset = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "1970";
  const date = new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function formatHandicapLine(line: string | number | null) {
  if (line === null) return "—";
  const value = Number(line);
  if (!Number.isFinite(value)) return String(line);
  const normalized = Number(value.toFixed(4));
  if (normalized === 0) return "0";
  return normalized > 0 ? `+${normalized}` : String(normalized);
}

function settlementBadgeClass(outcome: SettlementStatus) {
  const statusClass: Record<SettlementStatus, string> = {
    WIN: "settlement-win",
    HALF_WIN: "settlement-half-win",
    PUSH: "settlement-push",
    LOSS: "settlement-loss",
    HALF_LOSS: "settlement-half-loss",
  };
  return `settlement-badge ${statusClass[outcome]}`;
}

export default function FootballDashboard({ initialTab = "overview", requiresAdminToken }: { initialTab?: Tab; requiresAdminToken: boolean }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [tokenDraft, setTokenDraft] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [tab] = useState<Tab>(initialTab);
  const [discoveryMode, setDiscoveryMode] = useState<"LIVE" | "UPCOMING">("LIVE");
  const [discoveryPage, setDiscoveryPage] = useState(1);
  const [fixtureFilter, setFixtureFilter] = useState("ALL");
  const [fixtureFrom, setFixtureFrom] = useState(() => vietnamDateInput());
  const [fixtureTo, setFixtureTo] = useState(() => vietnamDateInput(7));
  const [fixtureLeagueId, setFixtureLeagueId] = useState("");
  const [fixtureStatus, setFixtureStatus] = useState("");
  const [fixtureSearch, setFixtureSearch] = useState("");
  const [historyFrom, setHistoryFrom] = useState(() => vietnamDateInput(-30));
  const [historyTo, setHistoryTo] = useState(() => vietnamDateInput());
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [analyticsBucketSize, setAnalyticsBucketSize] = useState(5);
  const [analyticsFrom, setAnalyticsFrom] = useState("");
  const [analyticsTo, setAnalyticsTo] = useState("");
  const [analyticsLeague, setAnalyticsLeague] = useState("ALL");
  const [analyticsPriceTolerance, setAnalyticsPriceTolerance] = useState(0);
  const [analyticsMarket, setAnalyticsMarket] = useState("ALL");
  const [analyticsSort, setAnalyticsSort] = useState<{ key: "minute" | "winRate"; direction: "asc" | "desc" }>({ key: "minute", direction: "asc" });
  const [expandedAnalyticsGroups, setExpandedAnalyticsGroups] = useState<Record<string, boolean>>({});
  const [testSearch, setTestSearch] = useState("");
  const [testFixtures, setTestFixtures] = useState<Fixture[]>([]);
  const [systemChecks, setSystemChecks] = useState<Record<string, SystemCheck>>({});
  const [systemBusy, setSystemBusy] = useState("");
  const [manualResults, setManualResults] = useState<Record<number, { homeScoreHt: string; awayScoreHt: string; homeScoreFt: string; awayScoreFt: string }>>({});
  const [fixtureIdDraft, setFixtureIdDraft] = useState("");
  const [selectedTestFixture, setSelectedTestFixture] = useState<Fixture | null>(null);
  const [testResult, setTestResult] = useState<{ raw: unknown; normalized: { values: OddsValue[] } } | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [selectedFixtureId, setSelectedFixtureId] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<FootballSettingsDraft>({
    leagueIds: [39] as number[],
    season: 2026,
    pollingIntervalSeconds: 300,
    dailyTotalLimit: 7500,
    dailyOddsBudget: 6000,
    dailyReservedBudget: 1500,
    isCollectorEnabled: true,
    oddsIntervalMinutes: 5,
    fixtureSyncIntervalHours: 6,
    statusCheckIntervalSeconds: 60,
    preferredBookmakerId: null as number | null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const hasAccess = !requiresAdminToken || Boolean(token);

  useEffect(() => {
    setDarkMode(window.localStorage.getItem("football-theme") === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !darkMode;
    window.localStorage.setItem("football-theme", next ? "dark" : "light");
    setDarkMode(next);
  };

  useEffect(() => {
    if (!requiresAdminToken) return;
    const savedToken = window.sessionStorage.getItem("football-admin-token") ?? "";
    if (savedToken) {
      setToken(savedToken);
      setTokenDraft(savedToken);
    }
  }, []);

  const overviewQuery = useQuery({
    queryKey: ["football", "overview", token],
    queryFn: () => requestJson<Overview>(token, "/api/football/overview"),
    enabled: hasAccess,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
  const fixturesQuery = useQuery({
    queryKey: ["football", "fixtures", fixtureFilter, fixtureFrom, fixtureTo, fixtureLeagueId, fixtureStatus, fixtureSearch, token],
    queryFn: () => requestJson<{ fixtures: FixtureRow[]; total: number }>(
      token,
      `/api/football/fixtures?${new URLSearchParams({ filter: fixtureFilter, from: fixtureFrom, to: fixtureTo, ...(fixtureLeagueId ? { leagueId: fixtureLeagueId } : {}), ...(fixtureStatus ? { status: fixtureStatus } : {}), ...(fixtureSearch ? { search: fixtureSearch } : {}) })}`,
    ),
    enabled: hasAccess && tab === "fixtures",
    refetchInterval: 30_000,
  });
  const oddsHistoryFixturesQuery = useQuery({
    queryKey: ["football", "odds-history-fixtures", historyFrom, historyTo, historySearch, historyPage, token],
    queryFn: () => requestJson<{ fixtures: FixtureRow[]; total: number; page: number; pageSize: number }>(
      token,
      `/api/football/fixtures?${new URLSearchParams({ recorded: "true", from: historyFrom, to: historyTo, page: String(historyPage), ...(historySearch.trim() ? { search: historySearch.trim() } : {}) })}`,
    ),
    enabled: hasAccess && tab === "history",
    refetchInterval: 30_000,
  });
  const footballAnalyticsQuery = useQuery({
    queryKey: ["football", "analytics", analyticsBucketSize, analyticsFrom, analyticsTo, analyticsLeague, analyticsPriceTolerance, token],
    queryFn: () => {
      const params = new URLSearchParams({ bucketSize: String(analyticsBucketSize), priceTolerance: String(analyticsPriceTolerance), league: analyticsLeague });
      if (analyticsFrom) params.set("from", analyticsFrom);
      if (analyticsTo) params.set("to", analyticsTo);
      return requestJson<FootballAnalyticsResponse>(token, `/api/football/analytics?${params}`);
    },
    enabled: hasAccess && tab === "analytics",
    refetchOnWindowFocus: false,
  });
  const discoveryQuery = useQuery({
    queryKey: ["football", "fixture-discovery", discoveryMode, token],
    queryFn: () => requestJson<{
      mode: "LIVE" | "UPCOMING";
      fetchedAt: string;
      total: number;
      fixtures: Array<Fixture & { id: string | null; leagueName: string; leagueCountry: string | null; snapshotCount: number }>;
    }>(token, "/api/football/fixtures/discover?mode=" + discoveryMode),
    enabled: hasAccess && tab === "radar",
    refetchOnWindowFocus: false,
    retry: false,
  });
  const settingsQuery = useQuery({
    queryKey: ["football", "settings", token],
    queryFn: () => requestJson<Settings>(token, "/api/football/settings"),
    enabled: hasAccess && tab === "settings",
  });
  const logsQuery = useQuery({
    queryKey: ["football", "logs", token],
    queryFn: () => requestJson<{ logs: Array<Record<string, unknown>>; apiUsage: Array<Record<string, unknown>>; total: number }>(token, "/api/football/logs"),
    enabled: hasAccess && tab === "logs",
  });
  const fixtureDetailQuery = useQuery({
    queryKey: ["football", "fixture", selectedFixtureId, token],
    queryFn: () => requestJson<FixtureDetails>(token, `/api/football/fixtures/${selectedFixtureId}`),
    enabled: hasAccess && Boolean(selectedFixtureId),
    refetchInterval: 15_000,
  });
  const trackingQuery = useQuery({
    queryKey: ["football", "tracking-live", token],
    queryFn: () => requestJson<TrackingRow[]>(token, "/api/football/tracking/live"),
    enabled: hasAccess && tab === "live",
    refetchInterval: 15_000,
  });
  const missingResultsQuery = useQuery({
    queryKey: ["football", "results-missing", token],
    queryFn: () => requestJson<{ fixtures: MissingResultRow[]; total: number }>(token, "/api/football/results/missing"),
    enabled: hasAccess && tab === "results",
    refetchInterval: 30_000,
  });
  const collectorStatusQuery = useQuery({
    queryKey: ["football", "system-collector", token],
    queryFn: () => requestJson<SystemCheck>(token, "/api/football/system/collector-status"),
    enabled: hasAccess && tab === "system",
    refetchInterval: 15_000,
  });
  const leaguesQuery = useQuery({
    queryKey: ["football", "leagues", token],
    queryFn: () => requestJson<Array<{ key: string; id: string | null; apiLeagueId: number; name: string; shortName: string; country: string; isEnabled: boolean; verifiedAt: string | null; upcomingCount: number; recordingCount: number; status: string }>>(token, "/api/football/leagues"),
    enabled: hasAccess && tab === "system",
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setSettingsDraft({
      leagueIds: settingsQuery.data.leagues.filter((league) => league.enabled).map((league) => league.leagueId),
      season: settingsQuery.data.season,
      pollingIntervalSeconds: settingsQuery.data.pollingIntervalSeconds,
      dailyTotalLimit: settingsQuery.data.dailyTotalLimit,
      dailyOddsBudget: settingsQuery.data.dailyOddsBudget,
      dailyReservedBudget: settingsQuery.data.dailyReservedBudget,
      isCollectorEnabled: settingsQuery.data.isCollectorEnabled ?? true,
      oddsIntervalMinutes: settingsQuery.data.oddsIntervalMinutes ?? 5,
      fixtureSyncIntervalHours: settingsQuery.data.fixtureSyncIntervalHours ?? 6,
      statusCheckIntervalSeconds: settingsQuery.data.statusCheckIntervalSeconds ?? 60,
      preferredBookmakerId: settingsQuery.data.preferredBookmakerId ?? null,
    });
  }, [settingsQuery.data]);

  const actionMutation = useMutation({
    mutationFn: async ({ path, body }: { path: string; body?: unknown }) => requestJson<unknown>(token, path, {
      method: "POST",
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    onSuccess: async () => {
      setActionError("");
      setActionMessage("");
      await queryClient.invalidateQueries({ queryKey: ["football"] });
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Thao tác không thành công."),
  });

  const settingsMutation = useMutation({
    mutationFn: () => requestJson<Settings>(token, "/api/football/settings", {
      method: "PATCH",
      body: JSON.stringify({
        leagueIds: settingsDraft.leagueIds,
        season: Number(settingsDraft.season),
        pollingIntervalSeconds: Number(settingsDraft.pollingIntervalSeconds),
        dailyTotalLimit: Number(settingsDraft.dailyTotalLimit),
        dailyOddsBudget: Number(settingsDraft.dailyOddsBudget),
        dailyReservedBudget: Number(settingsDraft.dailyReservedBudget),
        isCollectorEnabled: settingsDraft.isCollectorEnabled,
        oddsIntervalMinutes: Number(settingsDraft.oddsIntervalMinutes),
        fixtureSyncIntervalHours: Number(settingsDraft.fixtureSyncIntervalHours),
        statusCheckIntervalSeconds: Number(settingsDraft.statusCheckIntervalSeconds),
        preferredBookmakerId: settingsDraft.preferredBookmakerId,
      }),
    }),
    onSuccess: async () => {
      setActionError("");
      setActionMessage("");
      await queryClient.invalidateQueries({ queryKey: ["football"] });
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Không lưu được cấu hình."),
  });

  const normalizedOddsByMarket = useMemo(() => {
    if (!testResult) return null;
    const markets = parseStructuredLiveMarkets(testResult.normalized.values, {
      home: selectedTestFixture?.homeTeamName ?? "Home",
      away: selectedTestFixture?.awayTeamName ?? "Away",
    }, settingsDraft.preferredBookmakerId);
    return {
      bookmakerName: markets.bookmakerName,
      dataStatus: markets.dataStatus,
      rows: [
        ["AH H1", markets.ahHtLine, markets.ahHtHomePrice, markets.ahHtAwayPrice],
        ["OU H1", markets.ouHtLine, markets.ouHtOverPrice, markets.ouHtUnderPrice],
        ["AH FT", markets.ahFtLine, markets.ahFtHomePrice, markets.ahFtAwayPrice],
        ["OU FT", markets.ouFtLine, markets.ouFtOverPrice, markets.ouFtUnderPrice],
        ["AH góc H1", markets.cornerAhHtLine, markets.cornerAhHtHomePrice, markets.cornerAhHtAwayPrice],
        ["OU góc H1", markets.cornerOuHtLine, markets.cornerOuHtOverPrice, markets.cornerOuHtUnderPrice],
        ["AH góc FT", markets.cornerAhFtLine, markets.cornerAhFtHomePrice, markets.cornerAhFtAwayPrice],
        ["OU góc FT", markets.cornerOuFtLine, markets.cornerOuFtOverPrice, markets.cornerOuFtUnderPrice],
      ] as Array<[string, string | null, string | null, string | null]>,
    };
  }, [testResult, selectedTestFixture, settingsDraft.preferredBookmakerId]);

  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const candidate = tokenDraft.trim();
    if (!candidate) return;
    setActionError("");
    setActionMessage("");
    setIsConnecting(true);
    try {
      await requestJson<Overview>(candidate, "/api/football/overview");
      window.sessionStorage.setItem("football-admin-token", candidate);
      setToken(candidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể kết nối.";
      setActionError(message);
      if ((error as ApiError).status === 503) {
        setActionError("Server chưa cấu hình FOOTBALL_ADMIN_TOKEN. Hãy thêm biến này rồi khởi động lại ứng dụng.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const runSystemCheck = async (kind: "api" | "database") => {
    setSystemBusy(kind);
    try {
      const result = await requestJson<SystemCheck>(token, `/api/football/system/${kind === "api" ? "api-status" : "database-status"}`);
      setSystemChecks((current) => ({ ...current, [kind]: result }));
    } catch (error) {
      setSystemChecks((current) => ({ ...current, [kind]: { status: "ERROR", message: error instanceof Error ? error.message : "Check failed." } }));
    } finally {
      setSystemBusy("");
    }
  };

  const verifyLeagues = async () => {
    setSystemBusy("verify");
    try {
      const result = await requestJson<SystemCheck>(token, "/api/football/system/verify-leagues", { method: "POST" });
      setSystemChecks((current) => ({ ...current, verify: result }));
      await queryClient.invalidateQueries({ queryKey: ["football", "leagues"] });
    } catch (error) {
      setSystemChecks((current) => ({ ...current, verify: { status: "ERROR", message: error instanceof Error ? error.message : "Verification failed." } }));
    } finally {
      setSystemBusy("");
    }
  };

  const searchTestFixtures = async (live: boolean) => {
    const params = new URLSearchParams({ from: vietnamDateInput(), to: vietnamDateInput(3), ...(testSearch.trim() ? { search: testSearch.trim() } : {}), ...(live ? { live: "true" } : {}) });
    try {
      const result = await requestJson<{ fixtures: Fixture[] }>(token, `/api/football/fixtures/test?${params}`);
      setTestFixtures(result.fixtures);
      if (!selectedTestFixture && result.fixtures[0]) {
        setSelectedTestFixture(result.fixtures[0]);
        setFixtureIdDraft(String(result.fixtures[0].providerFixtureId));
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không tìm được trận test.");
    }
  };

  const findLive = () => searchTestFixtures(true);
  const startTracking = (providerFixtureId: number, isTest = false) => {
    actionMutation.mutate({ path: "/api/football/tracking/start", body: { providerFixtureId, isTest } });
  };
  const syncFixtureRange = () => actionMutation.mutate({
    path: "/api/football/fixtures/sync",
    body: { from: fixtureFrom, to: fixtureTo, ...(fixtureLeagueId ? { leagueIds: [Number(fixtureLeagueId)] } : {}) },
  });

  const saveManualResult = async (fixture: MissingResultRow) => {
    const draft = manualResults[fixture.providerFixtureId];
    if (!draft) return;
    try {
      await requestJson(token, `/api/football/results/${fixture.providerFixtureId}`, {
        method: "PATCH",
        body: JSON.stringify({ homeScoreHt: Number(draft.homeScoreHt), awayScoreHt: Number(draft.awayScoreHt), homeScoreFt: Number(draft.homeScoreFt), awayScoreFt: Number(draft.awayScoreFt) }),
      });
      setActionMessage(`Đã lưu kết quả thủ công cho ${fixture.homeTeamName} – ${fixture.awayTeamName}.`);
      await queryClient.invalidateQueries({ queryKey: ["football", "results-missing"] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không lưu được kết quả.");
    }
  };

  const toggleLeague = async (leagueId: number, enabled: boolean) => {
    setSystemBusy(`league-${leagueId}`);
    try {
      await requestJson(token, `/api/football/leagues/${leagueId}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled: enabled }),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["football", "leagues"] }),
        queryClient.invalidateQueries({ queryKey: ["football", "overview"] }),
      ]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không cập nhật được trạng thái giải.");
    } finally {
      setSystemBusy("");
    }
  };

  const fetchOdds = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fixtureId = Number(fixtureIdDraft);
    if (!Number.isInteger(fixtureId) || fixtureId <= 0) {
      setActionError("Nhập fixture ID hợp lệ trước khi lấy odds.");
      return;
    }
    setActionError("");
    setActionMessage("");
    setTestResult(null);
    try {
      const result = await requestJson<{ raw: unknown; normalized: { values: OddsValue[] } }>(
        token,
        "/api/football/test/fetch-odds",
        { method: "POST", body: JSON.stringify({ fixtureId }) },
      );
      setTestResult(result);
      if (selectedTestFixture?.providerFixtureId !== fixtureId) setSelectedTestFixture(null);
      await queryClient.invalidateQueries({ queryKey: ["football", "overview"] });
      await queryClient.invalidateQueries({ queryKey: ["football", "logs"] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không lấy được live odds.");
    }
  };

  const saveSnapshot = async () => {
    if (!testResult) return;
    const fixtureId = Number(fixtureIdDraft);
    try {
      const result = await requestJson<{ saved: boolean; duplicate: boolean; dataStatus: string }>(
        token,
        "/api/football/test/save-snapshot",
        {
          method: "POST",
          body: JSON.stringify({ fixtureId, raw: testResult.raw, fixture: selectedTestFixture }),
        },
      );
      setActionMessage(result.duplicate
        ? "Odds giống snapshot gần nhất. Không tạo bản ghi trùng."
        : `Đã lưu snapshot AH / OU (${result.dataStatus}).`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["football", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["football", "fixtures"] }),
      ]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Không lưu được snapshot.");
    }
  };

  const logout = () => {
    window.sessionStorage.removeItem("football-admin-token");
    setToken("");
    setTokenDraft("");
    setSelectedTestFixture(null);
    setTestResult(null);
  };

  const actionPending = actionMutation.isPending || settingsMutation.isPending;
  const overview = overviewQuery.data;
  const hasConnectionError = overviewQuery.error instanceof Error;
  const allFixtureRows = fixturesQuery.data?.fixtures ?? [];
  const upcomingFixtureRows = allFixtureRows.filter((fixture) => ["NS", "TBD"].includes(fixture.status));
  const liveFixtureRows = allFixtureRows
    .filter((fixture) => ["1H", "HT", "2H", "ET", "BT", "P", "INT", "LIVE", "SUSP"].includes(fixture.status))
    .sort((left, right) => Date.parse(left.kickoffAt) - Date.parse(right.kickoffAt));
  const finishedFixtureRows = allFixtureRows
    .filter((fixture) => ["FT", "AET", "PEN", "AWD", "WO"].includes(fixture.status) && fixture.homeScore !== null && fixture.awayScore !== null)
    .sort((left, right) => Date.parse(right.kickoffAt) - Date.parse(left.kickoffAt));
  const groupedUpcomingFixtures = groupFixturesByLeague(upcomingFixtureRows);
  const groupedFixtureIds = new Set([
    ...upcomingFixtureRows,
    ...liveFixtureRows,
    ...finishedFixtureRows,
  ].map((fixture) => fixture.id));
  const otherFixtureRows = allFixtureRows
    .filter((fixture) => !groupedFixtureIds.has(fixture.id))
    .sort((left, right) => Date.parse(left.kickoffAt) - Date.parse(right.kickoffAt));
  const visibleAnalyticsGroups = [...(footballAnalyticsQuery.data?.groups ?? [])]
    .filter((group) => analyticsMarket === "ALL" || group.marketKey === analyticsMarket)
    .sort((left, right) => {
      if (analyticsSort.key === "winRate") {
        if (left.winRate === null && right.winRate !== null) return 1;
        if (left.winRate !== null && right.winRate === null) return -1;
        if (left.winRate !== null && right.winRate !== null) {
          const rateOrder = left.winRate - right.winRate;
          if (rateOrder !== 0) return analyticsSort.direction === "asc" ? rateOrder : -rateOrder;
        }
      } else {
        const minuteOrder = left.bucketStart - right.bucketStart || left.bucketEnd - right.bucketEnd;
        if (minuteOrder !== 0) return analyticsSort.direction === "asc" ? minuteOrder : -minuteOrder;
      }
      return left.bucketStart - right.bucketStart || left.marketLabel.localeCompare(right.marketLabel) || left.score.localeCompare(right.score);
    });

  if (requiresAdminToken && (!token || hasConnectionError)) {
    return (
      <main className={`min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8 ${darkMode ? "football-theme-dark" : ""}`}>
        <div className="mx-auto max-w-7xl">
          <Header onLogout={undefined} darkMode={darkMode} onToggleTheme={toggleTheme} />
          <section className="mx-auto mt-10 max-w-xl rounded border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-11 w-11 items-center justify-center rounded border border-teal-200 bg-teal-50 text-teal-800">
              <KeyRound size={20} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-950">Kết nối khu vực quản trị</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Nhập token quản trị đã cấu hình trên server. Token chỉ được giữ trong phiên trình duyệt hiện tại.
            </p>
            <form className="mt-5 space-y-3" onSubmit={connect}>
              <label className="block text-sm font-medium text-slate-700" htmlFor="admin-token">
                Football admin token
              </label>
              <input
                id="admin-token"
                autoComplete="current-password"
                type="password"
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
                placeholder="FOOTBALL_ADMIN_TOKEN"
                className="h-11 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700"
              />
              <button
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded bg-slate-900 px-4 text-sm font-semibold text-white"
                disabled={isConnecting || !tokenDraft.trim()}
              >
                {isConnecting ? <LoaderCircle className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                Kết nối an toàn
              </button>
            </form>
            {(actionError || overviewQuery.error) && (
              <p className="mt-4 flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 shrink-0" size={16} />
                {actionError || (overviewQuery.error as Error).message}
              </p>
            )}
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
              Thao tác dùng quota chỉ gọi API khi bạn chủ động bấm. API key của provider không gửi tới trình duyệt.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const renderFixtureRow = (fixture: FixtureRow) => (
    <tr key={fixture.id} className="hover:bg-slate-50/70">
      <td className="px-4 py-3"><FixtureTeams fixture={fixture} /></td>
      <td className={`px-4 py-3 text-sm font-semibold ${isUpcomingBeforeTomorrowMorning(fixture.kickoffAt) ? "text-amber-600" : "text-slate-700"}`}>
        {formatFixtureDateTime(fixture.kickoffAt)}
      </td>
      <td className="px-4 py-3"><span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${statusClass(fixture.status)}`}>{statusLabel(fixture.status)}</span></td>
      <td className="px-4 py-3 text-center font-semibold tabular-nums text-slate-900">{fixture.homeScore ?? "—"} : {fixture.awayScore ?? "—"}</td>
      <td className="px-4 py-3 text-center">
        {fixture.latestAhFtLine !== null || fixture.latestAhFtHomePrice !== null || fixture.latestAhFtAwayPrice !== null
          ? <span className="inline-grid min-w-[150px] grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs tabular-nums text-slate-700" title="Kèo chấp toàn trận · snapshot gần nhất">
              <span className="text-right">{formatOddsPrice(fixture.latestAhFtHomePrice)}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-800">{formatAsianHandicapLine(fixture.latestAhFtLine)}</span>
              <span className="text-left">{formatOddsPrice(fixture.latestAhFtAwayPrice)}</span>
            </span>
          : <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{fixture.snapshotCount}</td>
      <td className="px-4 py-3 text-right">
        {fixture.liveTracking?.isEnabled
          ? <button onClick={() => actionMutation.mutate({ path: `/api/football/tracking/${fixture.liveTracking!.id}/cancel` })} className="inline-flex h-8 items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-800">Đã bật · Hủy</button>
          : <button onClick={() => startTracking(fixture.providerFixtureId, fixture.isTestFixture)} disabled={actionPending || ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"].includes(fixture.status)} className="inline-flex h-8 items-center gap-1 rounded border border-teal-700 bg-teal-700 px-2.5 text-xs font-semibold text-white disabled:opacity-40">Ghi Live Odds</button>}
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => setSelectedFixtureId(fixture.id)} className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700"><Eye size={14} /> Xem</button>
      </td>
    </tr>
  );

  const renderFixtureSectionHeader = (key: string, label: string, count: number) => (
    <tr key={key} className="bg-slate-50">
      <td colSpan={8} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-700">
        <span>{label}</span><span className="ml-2 font-medium normal-case tracking-normal text-slate-500">{count} trận</span>
      </td>
    </tr>
  );

  return (
    <main className={`min-h-screen bg-slate-50 text-slate-900 ${darkMode ? "football-theme-dark" : ""}`}>
      <Header onLogout={requiresAdminToken ? logout : undefined} darkMode={darkMode} onToggleTheme={toggleTheme} />
      <div className="grid w-full gap-4 px-4 pb-12 pt-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="grid grid-cols-2 gap-1 rounded border border-slate-200 bg-white p-2 sm:grid-cols-4 lg:grid-cols-1" aria-label="Football collector sections">
            {TABS.map(({ id, label, icon: Icon }) => (
              <Link
                href={FOOTBALL_TAB_PATHS[id]}
                key={id}
                aria-current={tab === id ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-2 rounded px-3 text-left text-sm font-semibold transition-colors ${tab === id ? "bg-teal-50 text-teal-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
              >
                <Icon size={16} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-3 rounded border border-slate-200 bg-white p-3">
            <div className={`flex min-h-9 items-center gap-2 text-xs font-semibold ${overview?.collector.workerOnline ? "text-emerald-700" : "text-slate-500"}`}>
              {overview?.collector.workerOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
              Worker {overview?.collector.workerOnline ? "online" : "offline"}
            </div>
            <button
              onClick={() => void overviewQuery.refetch()}
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} className={overviewQuery.isFetching ? "animate-spin" : ""} />
              Làm mới dữ liệu
            </button>
          </div>
        </aside>
        <div className="min-w-0">
        {tab === "overview" && <div className="mb-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Data operations</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">Football Live Odds</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Theo dõi lịch thi đấu của 9 giải đã chọn, kiểm tra live odds và lưu lịch sử biến động từ API-Football.
            </p>
          </div>
        </div>}

        {overviewQuery.error && (
          <ErrorBanner
            message={(overviewQuery.error as Error).message}
            onDismiss={() => {
              if (requiresAdminToken) logout();
              else void overviewQuery.refetch();
            }}
          />
        )}
        {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError("")} />}
        {actionMessage && <div className="mb-4 flex items-center justify-between gap-3 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><span className="flex items-center gap-2"><Check size={16} />{actionMessage}</span><button onClick={() => setActionMessage("")} aria-label="Dismiss" className="text-emerald-800"><X size={16} /></button></div>}
        {overview && !overview.serverConfigured && <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">API_FOOTBALL_KEY chưa được cấu hình. Dashboard chỉ hiển thị dữ liệu đã lưu; test và đồng bộ sẽ không gọi được provider.</div>}

        {tab === "overview" && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Quota còn lại" value={`${overview?.quota.remaining ?? "—"} / ${overview?.quota.totalLimit ?? "—"}`} />
          <Metric label="Requests hôm nay" value={String(overview?.requestsToday ?? "—")} />
          <Metric label="Live fixtures" value={String(overview?.liveFixtures.length ?? "—")} />
          <Metric label="Snapshots production" value={String(overview?.snapshotsSaved ?? "—")} />
        </section>}

        {tab === "overview" && <section className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Collector status</h2>
                <p className="mt-1 text-xs text-slate-500">{overview?.collector.enabledLeagueCount ?? 0} / {FOOTBALL_LEAGUES.length} giải đang được chọn · Season {overview?.collector.season ?? 2026}</p>
              </div>
              <span className={`inline-flex rounded border px-2.5 py-1 text-xs font-semibold ${overview?.collector.enabled ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                {overview?.collector.enabled ? "Collector enabled" : "Chưa chọn giải"}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat label="Worker state" value={overview?.collector.status ?? "—"} />
              <MiniStat label="Lần chạy gần nhất" value={formatDate(overview?.collector.lastRunAt)} />
              <MiniStat label="Last sync" value={formatDate(overview?.collector.lastFixtureSyncAt, { year: undefined })} />
              <MiniStat label="Next run" value={formatDate(overview?.collector.nextRunAt)} />
            </div>
            {overview?.collector.lastError && (
              <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-700">{overview.collector.lastError}</p>
            )}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {overview?.collectors.map((league) => (
                <div key={league.leagueId} className="flex items-center justify-between gap-3 rounded border border-slate-100 px-3 py-2 text-xs">
                  <span className="min-w-0 truncate font-medium text-slate-700">{league.shortName} · {league.country}</span>
                  <span className={`shrink-0 ${league.enabled ? "text-teal-700" : "text-slate-400"}`}>{league.enabled ? league.status : "Tắt"}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">WAITING nghĩa là chưa có trận nào của giải được bật ghi odds hoặc đang live; không đồng nghĩa với lỗi kết nối.</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-slate-950">Quota hôm nay</h2>
                <p className="mt-1 text-xs text-slate-500">Reset {formatDate(overview?.quota.resetAt)} UTC</p>
              </div>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                Provider: {overview?.quota.providerRemaining ?? "chưa báo"}
              </span>
            </div>
            <QuotaBar label="Live odds" used={overview?.quota.oddsUsed ?? 0} limit={overview?.quota.oddsBudget ?? 80} />
            <QuotaBar label="Lịch và kiểm tra live" used={overview?.quota.reservedUsed ?? 0} limit={overview?.quota.reservedBudget ?? 20} />
          </div>
        </section>}

        <div>
          {tab === "fixtures" && (
            <section className="rounded border border-slate-200 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950">Fixtures</h2>
                  <p className="mt-1 text-xs text-slate-500">Lịch đã đồng bộ và odds snapshot theo từng trận.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[["ALL", "Tất cả"], ["LIVE", "Live"], ["UPCOMING", "Sắp đá"], ["FINISHED", "Đã xong"], ["TEST", "Test"]].map(([filter, label]) => (
                    <button
                      key={filter}
                      onClick={() => setFixtureFilter(filter)}
                      className={`h-8 rounded border px-3 text-xs font-semibold ${fixtureFilter === filter ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-600"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-6">
                <label className="text-xs font-medium text-slate-600">Từ ngày
                  <input type="date" value={fixtureFrom} onChange={(event) => setFixtureFrom(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm" />
                </label>
                <label className="text-xs font-medium text-slate-600">Đến ngày
                  <input type="date" value={fixtureTo} onChange={(event) => setFixtureTo(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm" />
                </label>
                <label className="text-xs font-medium text-slate-600">Giải
                  <select value={fixtureLeagueId} onChange={(event) => setFixtureLeagueId(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm">
                    <option value="">Tất cả 9 giải</option>{FOOTBALL_LEAGUES.map((league) => <option key={league.id} value={league.id}>{league.shortName}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">Trạng thái
                  <select value={fixtureStatus} onChange={(event) => setFixtureStatus(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm">
                    <option value="">Tất cả</option>{["NS", "1H", "HT", "2H", "FT", "PST", "CANC"].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600 sm:col-span-2">Tìm tên đội
                  <input value={fixtureSearch} onChange={(event) => setFixtureSearch(event.target.value)} placeholder="Ví dụ: Arsenal" className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm" />
                </label>
                <div className="flex items-end sm:col-span-2 lg:col-span-6">
                  <button onClick={syncFixtureRange} disabled={actionPending} className="inline-flex h-9 items-center gap-2 rounded bg-slate-900 px-3 text-xs font-semibold text-white"><RefreshCw size={14} /> Sync Fixtures · API</button>
                  <span className="ml-3 self-center text-xs text-slate-500">Đồng bộ chỉ gọi API cho giải đã bật; không xóa lịch cũ.</span>
                </div>
              </div>
              <div className="table-scroll overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Trận đấu</th>
                      <th className="px-4 py-3 font-semibold">Giờ Việt Nam</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 text-center font-semibold">Tỷ số</th>
                      <th className="px-4 py-3 text-center font-semibold">Tỷ lệ chấp FT</th>
                      <th className="px-4 py-3 text-right font-semibold">Snapshots</th>
                      <th className="px-4 py-3 text-right font-semibold">Live Odds</th>
                      <th className="px-4 py-3 text-right font-semibold">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {upcomingFixtureRows.length > 0 && <>
                      {renderFixtureSectionHeader("upcoming", "Chưa đấu", upcomingFixtureRows.length)}
                      {groupedUpcomingFixtures.flatMap((group) => [
                        <tr key={`league-${group.leagueId}`} className="bg-white">
                          <td colSpan={8} className="border-b border-slate-100 px-4 py-2 text-xs font-semibold text-slate-600">
                            {group.label}<span className="ml-2 font-normal text-slate-400">{group.fixtures.length} trận · theo giờ đá gần nhất</span>
                          </td>
                        </tr>,
                        ...group.fixtures.map(renderFixtureRow),
                      ])}
                    </>}
                    {liveFixtureRows.length > 0 && <>
                      {renderFixtureSectionHeader("live", "Đang diễn ra", liveFixtureRows.length)}
                      {liveFixtureRows.map(renderFixtureRow)}
                    </>}
                    {otherFixtureRows.length > 0 && <>
                      {renderFixtureSectionHeader("other", "Khác · hoãn hoặc chưa có kết quả", otherFixtureRows.length)}
                      {otherFixtureRows.map(renderFixtureRow)}
                    </>}
                    {finishedFixtureRows.length > 0 && <>
                      {renderFixtureSectionHeader("finished", "Đã đấu có kết quả", finishedFixtureRows.length)}
                      {finishedFixtureRows.map(renderFixtureRow)}
                    </>}
                    {fixturesQuery.data?.fixtures.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">Chưa có fixture trong nhóm này. Hãy đồng bộ lịch hoặc kiểm tra lại ngày thi đấu.</td></tr>}
                    {fixturesQuery.isLoading && <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">Đang tải fixtures…</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">{fixturesQuery.data?.total ?? 0} fixtures</div>
            </section>
          )}

          {tab === "analytics" && <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="font-semibold text-slate-950">Phân tích kèo theo khung phút</h2>
                <p className="mt-1 text-xs text-slate-500">Gom các trận có cùng tỷ số tại snapshot, cùng loại kèo và line; hai mức giá được so theo độ chênh đã chọn.</p>
              </div>
              <button onClick={() => void footballAnalyticsQuery.refetch()} className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700"><RefreshCw size={14} className={footballAnalyticsQuery.isFetching ? "animate-spin" : ""} /> Tải lại</button>
            </div>
            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-6">
              <label className="text-xs font-medium text-slate-600">Giải đấu
                <select value={analyticsLeague} onChange={(event) => setAnalyticsLeague(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm">
                  <option value="ALL">Tất cả giải</option>
                  <option value="SAVED">9 giải đã lưu</option>
                  <option value="OTHER">Giải khác</option>
                  <optgroup label="Chọn từng giải đã lưu">
                    {FOOTBALL_LEAGUES.map((league) => <option key={league.id} value={league.id}>{league.shortName} · {league.country}</option>)}
                  </optgroup>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">Gom khung phút
                <select value={analyticsBucketSize} onChange={(event) => setAnalyticsBucketSize(Number(event.target.value))} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm">
                  {[1, 2, 3, 5, 10, 15].map((size) => <option key={size} value={size}>{size} phút</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">Từ ngày
                <input type="date" value={analyticsFrom} onChange={(event) => setAnalyticsFrom(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">Đến ngày
                <input type="date" value={analyticsTo} onChange={(event) => setAnalyticsTo(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">Loại kèo
                <select value={analyticsMarket} onChange={(event) => setAnalyticsMarket(event.target.value)} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm">
                  <option value="ALL">Tất cả kèo</option>
                  <option value="ahHt">Chấp H1</option><option value="ouHt">Tài/Xỉu H1</option>
                  <option value="ahFt">Chấp FT</option><option value="ouFt">Tài/Xỉu FT</option>
                  <option value="cornerAhHt">Chấp góc H1</option><option value="cornerOuHt">Tài/Xỉu góc H1</option>
                  <option value="cornerAhFt">Chấp góc FT</option><option value="cornerOuFt">Tài/Xỉu góc FT</option>
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">Gom theo chênh lệch giá
                <select value={analyticsPriceTolerance} onChange={(event) => setAnalyticsPriceTolerance(Number(event.target.value))} className="mt-1 h-9 w-full rounded border border-slate-300 bg-white px-2 text-sm">
                  <option value={0}>Đúng giá</option>
                  {[0.1, 0.2, 0.3, 0.4, 0.5].map((tolerance) => <option key={tolerance} value={tolerance}>Chênh lệch tối đa {tolerance.toFixed(1)}</option>)}
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
              <span>{footballAnalyticsQuery.data?.snapshotCount ?? 0} snapshot trận đã kết thúc</span>
              <span>{footballAnalyticsQuery.data?.groupCount ?? 0} nhóm trùng từ 2 trận</span>
              <span>Khung {analyticsBucketSize} phút: {analyticsBucketSize === 5 ? "0–4, 5–9, 10–14…" : `0–${analyticsBucketSize - 1}, ${analyticsBucketSize}–${analyticsBucketSize * 2 - 1}…`}</span>
            </div>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th aria-sort={analyticsSort.key === "minute" ? analyticsSort.direction === "asc" ? "ascending" : "descending" : "none"} className="px-3 py-3"><button type="button" onClick={() => setAnalyticsSort((current) => current.key === "minute" ? { key: "minute", direction: current.direction === "asc" ? "desc" : "asc" } : { key: "minute", direction: "asc" })} className="inline-flex items-center gap-1">Khung phút{analyticsSort.key === "minute" ? analyticsSort.direction === "asc" ? " ↑" : " ↓" : ""}</button></th><th className="px-3 py-3">Tỷ số lúc ghi</th><th className="px-3 py-3">Góc lúc ghi</th><th className="px-3 py-3">Kèo</th><th className="px-3 py-3">Line</th><th className="px-3 py-3">Kết quả</th><th className="px-3 py-3 text-right">Số trận</th><th aria-sort={analyticsSort.key === "winRate" ? analyticsSort.direction === "asc" ? "ascending" : "descending" : "none"} className="px-3 py-3 text-right"><button type="button" onClick={() => setAnalyticsSort((current) => current.key === "winRate" ? { key: "winRate", direction: current.direction === "asc" ? "desc" : "asc" } : { key: "winRate", direction: "desc" })} className="inline-flex items-center gap-1">Tỷ lệ thắng{analyticsSort.key === "winRate" ? analyticsSort.direction === "asc" ? " ↑" : " ↓" : ""}</button></th><th className="px-3 py-3 text-right">Chi tiết</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleAnalyticsGroups.map((group) => {
                    const expanded = Boolean(expandedAnalyticsGroups[group.key]);
                    const isHandicap = group.marketKey.toLowerCase().includes("ah");
                    const displayLine = isHandicap ? formatHandicapLine(group.line) : group.line;
                    return <Fragment key={group.key}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="px-3 py-3 font-semibold tabular-nums">{group.bucketStart}–{group.bucketEnd}′</td>
                        <td className="px-3 py-3 font-semibold tabular-nums">{group.score}</td>
                        <td className="px-3 py-3 tabular-nums">{group.corners ?? "—"}</td>
                        <td className="px-3 py-3">{group.marketLabel} · {group.selection}</td>
                        <td className="px-3 py-3 font-semibold tabular-nums">{displayLine}</td>
                        <td className="px-3 py-3"><div className="flex flex-wrap gap-1.5">
                          {group.outcomes.WIN > 0 && <span className={`${settlementBadgeClass("WIN")} rounded px-1.5 py-0.5 text-xs`}>Thắng {group.outcomes.WIN}</span>}
                          {group.outcomes.HALF_WIN > 0 && <span className={`${settlementBadgeClass("HALF_WIN")} rounded px-1.5 py-0.5 text-xs`}>Nửa thắng {group.outcomes.HALF_WIN}</span>}
                          {group.outcomes.PUSH > 0 && <span className={`${settlementBadgeClass("PUSH")} rounded px-1.5 py-0.5 text-xs`}>Hòa {group.outcomes.PUSH}</span>}
                          {group.outcomes.HALF_LOSS > 0 && <span className={`${settlementBadgeClass("HALF_LOSS")} rounded px-1.5 py-0.5 text-xs`}>Nửa thua {group.outcomes.HALF_LOSS}</span>}
                          {group.outcomes.LOSS > 0 && <span className={`${settlementBadgeClass("LOSS")} rounded px-1.5 py-0.5 text-xs`}>Thua {group.outcomes.LOSS}</span>}
                        </div></td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{group.matchCount}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{group.winRate === null ? "—" : `${group.winRate}%`}</td>
                        <td className="px-3 py-3 text-right"><button onClick={() => setExpandedAnalyticsGroups((current) => ({ ...current, [group.key]: !current[group.key] }))} className="h-8 rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-700">{expanded ? "Ẩn" : "Xem trận"}</button></td>
                      </tr>
                      {expanded && <tr className="bg-slate-50"><td colSpan={9} className="p-3"><div className="table-scroll overflow-x-auto rounded border border-slate-200 bg-white"><table className="w-full min-w-[880px] text-left text-xs"><thead className="bg-slate-100 text-slate-500"><tr><th className="px-3 py-2">Trận</th><th className="px-3 py-2">Phút</th><th className="px-3 py-2">Tỷ số lúc ghi</th><th className="px-3 py-2">Góc lúc ghi</th><th className="px-3 py-2">Tỷ số chốt kèo (góc)</th><th className="px-3 py-2">Giá hai cửa</th><th className="px-3 py-2">Kết quả</th></tr></thead><tbody className="divide-y divide-slate-100">{group.matches.map((match) => <tr key={`${match.fixtureId}-${match.actualMinute}`}><td className="px-3 py-2">{match.homeTeamName} – {match.awayTeamName}<span className="ml-2 text-slate-400">#{match.providerFixtureId}</span></td><td className="px-3 py-2 tabular-nums">{match.actualMinute}′</td><td className="px-3 py-2 tabular-nums">{match.score}</td><td className="px-3 py-2 tabular-nums">{match.corners ?? "—"}</td><td className="px-3 py-2 tabular-nums">{match.finalScore}{match.finalCorners ? ` (${match.finalCorners})` : ""}</td><td className="px-3 py-2 tabular-nums">{match.firstPrice} / {match.secondPrice}</td><td className="px-3 py-2"><span className={`${settlementBadgeClass(match.outcome)} rounded px-1.5 py-0.5 font-semibold`}>{match.outcome === "WIN" ? "Thắng" : match.outcome === "LOSS" ? "Thua" : match.outcome === "PUSH" ? "Hòa" : match.outcome === "HALF_WIN" ? "Nửa thắng" : "Nửa thua"}</span></td></tr>)}</tbody></table></div></td></tr>}
                    </Fragment>;
                  })}
                  {footballAnalyticsQuery.isLoading && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">Đang tổng hợp dữ liệu…</td></tr>}
                  {footballAnalyticsQuery.isError && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-rose-700">{footballAnalyticsQuery.error instanceof Error ? footballAnalyticsQuery.error.message : "Không tải được dữ liệu phân tích."}</td></tr>}
                  {!footballAnalyticsQuery.isLoading && !footballAnalyticsQuery.isError && visibleAnalyticsGroups.length === 0 && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">Chưa có nhóm trùng từ hai trận với điều kiện này.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Giá Nhà/Tài và Khách/Xỉu đều phải nằm trong mức chênh lệch đã chọn; “Đúng giá” yêu cầu cả hai mức giá trùng nhau.</p>
          </section>}

          {tab === "history" && <section className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="font-semibold text-slate-950">Lịch sử odds đã ghi</h2>
                <p className="mt-1 text-xs text-slate-500">Các trận có snapshot odds đã lưu; chọn trận để xem lịch sử từng phút.</p>
              </div>
              <button onClick={() => void oddsHistoryFixturesQuery.refetch()} className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700"><RefreshCw size={14} className={oddsHistoryFixturesQuery.isFetching ? "animate-spin" : ""} /> Tải lại</button>
            </div>
            <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[180px_180px_minmax(220px,1fr)]">
              <label className="text-xs font-medium text-slate-600">Từ ngày
                <input type="date" value={historyFrom} onChange={(event) => { setHistoryFrom(event.target.value); setHistoryPage(1); }} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">Đến ngày
                <input type="date" value={historyTo} onChange={(event) => { setHistoryTo(event.target.value); setHistoryPage(1); }} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm" />
              </label>
              <label className="text-xs font-medium text-slate-600">Tìm đội
                <input value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); setHistoryPage(1); }} placeholder="Tên đội bóng" className="mt-1 h-9 w-full rounded border border-slate-300 px-3 text-sm" />
              </label>
            </div>
            <div className="table-scroll overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Trận đấu</th><th className="px-4 py-3">Ngày giờ</th><th className="px-4 py-3">Tỷ số (góc)</th><th className="px-4 py-3 text-right">Snapshots</th><th className="px-4 py-3">Ghi gần nhất</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(oddsHistoryFixturesQuery.data?.fixtures ?? []).map((fixture) => <tr key={fixture.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3"><FixtureTeams fixture={fixture} />{fixture.isTestFixture && <span className="mt-1 inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">TEST</span>}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatFixtureDateTime(fixture.kickoffAt)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      <div>{fixture.homeScore ?? "—"}-{fixture.awayScore ?? "—"}</div>
                      {fixture.homeScoreHt != null && fixture.awayScoreHt != null && <div className="mt-0.5 text-xs font-normal text-slate-500">H1 {fixture.homeScoreHt}-{fixture.awayScoreHt}</div>}
                      <div className="mt-0.5 text-xs font-normal text-slate-500">
                        {(["FT", "AET", "PEN"].includes(fixture.status) || fixture.homeCornerKicksHt != null || fixture.homeCornerKicksFt != null)
                          ? `(H1 ${fixture.homeCornerKicksHt != null && fixture.awayCornerKicksHt != null ? `${fixture.homeCornerKicksHt}-${fixture.awayCornerKicksHt}` : "—"} · FT ${fixture.homeCornerKicksFt != null && fixture.awayCornerKicksFt != null ? `${fixture.homeCornerKicksFt}-${fixture.awayCornerKicksFt}` : fixture.latestHomeCornerKicks != null && fixture.latestAwayCornerKicks != null ? `${fixture.latestHomeCornerKicks}-${fixture.latestAwayCornerKicks}` : "—"})`
                          : fixture.latestHomeCornerKicks != null && fixture.latestAwayCornerKicks != null
                            ? `(${fixture.latestHomeCornerKicks}-${fixture.latestAwayCornerKicks})`
                            : "(—)"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{fixture.snapshotCount}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{fixture.lastOddsAt ? formatDate(fixture.lastOddsAt) : "—"}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => setSelectedFixtureId(fixture.id)} className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-700"><Eye size={14} /> Xem odds</button></td>
                  </tr>)}
                  {oddsHistoryFixturesQuery.isLoading && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">Đang tải lịch sử…</td></tr>}
                  {!oddsHistoryFixturesQuery.isLoading && (oddsHistoryFixturesQuery.data?.fixtures.length ?? 0) === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">Chưa có trận nào được lưu odds trong khoảng thời gian này.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <span>{oddsHistoryFixturesQuery.data?.total ?? 0} trận đã ghi</span>
              <div className="flex items-center gap-2">
                <button disabled={historyPage <= 1 || oddsHistoryFixturesQuery.isFetching} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))} className="h-8 rounded border border-slate-300 px-3 font-semibold disabled:opacity-40">Trước</button>
                <span>Trang {historyPage} / {Math.max(1, Math.ceil((oddsHistoryFixturesQuery.data?.total ?? 0) / (oddsHistoryFixturesQuery.data?.pageSize ?? 50)))}</span>
                <button disabled={historyPage >= Math.ceil((oddsHistoryFixturesQuery.data?.total ?? 0) / (oddsHistoryFixturesQuery.data?.pageSize ?? 50)) || oddsHistoryFixturesQuery.isFetching} onClick={() => setHistoryPage((page) => page + 1)} className="h-8 rounded border border-slate-300 px-3 font-semibold disabled:opacity-40">Sau</button>
              </div>
            </div>
          </section>}

          {tab === "radar" && (
            <ExternalFixtureRadar
              mode={discoveryMode}
              setMode={(mode) => {
                setDiscoveryMode(mode);
                setDiscoveryPage(1);
              }}
              page={discoveryPage}
              setPage={setDiscoveryPage}
              fixtures={discoveryQuery.data?.fixtures ?? []}
              total={discoveryQuery.data?.total ?? 0}
              fetchedAt={discoveryQuery.data?.fetchedAt ?? null}
              loading={discoveryQuery.isFetching}
              error={discoveryQuery.error instanceof Error ? discoveryQuery.error.message : ""}
              busy={actionPending}
              onRefresh={() => void discoveryQuery.refetch()}
              onTrack={(fixture) => startTracking(fixture.providerFixtureId, false)}
              onCancel={(trackingId) => actionMutation.mutate({ path: "/api/football/tracking/" + trackingId + "/cancel" })}
              onView={(fixtureId) => setSelectedFixtureId(fixtureId)}
            />
          )}

          {tab === "test" && (
            <TestPanel
              fixtureIdDraft={fixtureIdDraft}
              setFixtureIdDraft={setFixtureIdDraft}
              searchQuery={testSearch}
              setSearchQuery={setTestSearch}
              testFixtures={testFixtures}
              selectedFixture={selectedTestFixture}
              result={testResult}
              markets={normalizedOddsByMarket?.rows ?? []}
              bookmakerName={normalizedOddsByMarket?.bookmakerName ?? null}
              dataStatus={normalizedOddsByMarket?.dataStatus ?? null}
              busy={actionPending}
              onFindLive={findLive}
              onSearchFixtures={() => searchTestFixtures(false)}
              onTrackFixture={(fixture) => startTracking(fixture.providerFixtureId, true)}
              onSelectFixture={(fixture) => {
                setSelectedTestFixture(fixture);
                setFixtureIdDraft(String(fixture.providerFixtureId));
                setTestResult(null);
              }}
              onFetchOdds={fetchOdds}
              onSaveSnapshot={saveSnapshot}
            />
          )}

          {tab === "live" && (
            <LiveRecordingPanel
              trackings={trackingQuery.data ?? []}
              loading={trackingQuery.isLoading}
              refreshing={trackingQuery.isFetching}
              onRefresh={() => void trackingQuery.refetch()}
              onView={(fixtureId) => setSelectedFixtureId(fixtureId)}
              onCancel={(trackingId) => actionMutation.mutate({ path: `/api/football/tracking/${trackingId}/cancel` })}
              busy={actionPending}
            />
          )}

          {tab === "results" && (
            <MissingResultsPanel
              fixtures={missingResultsQuery.data?.fixtures ?? []}
              loading={missingResultsQuery.isLoading}
              drafts={manualResults}
              setDrafts={setManualResults}
              onSync={(fixtureId) => actionMutation.mutate({ path: `/api/football/results/${fixtureId}/sync` })}
              onSave={saveManualResult}
              busy={actionPending}
              onView={(fixtureId) => setSelectedFixtureId(fixtureId)}
            />
          )}

          {tab === "system" && (
            <SystemStatusPanel
              checks={systemChecks}
              collector={collectorStatusQuery.data}
              collectorLoading={collectorStatusQuery.isLoading}
              leagues={leaguesQuery.data ?? []}
              onCheckApi={() => runSystemCheck("api")}
              onCheckDatabase={() => runSystemCheck("database")}
              onCheckCollector={() => void collectorStatusQuery.refetch()}
              onVerifyLeagues={verifyLeagues}
              onToggleLeague={toggleLeague}
              busy={systemBusy}
            />
          )}

          {tab === "settings" && (
            <SettingsPanel
              settings={settingsQuery.data}
              draft={settingsDraft}
              setDraft={setSettingsDraft}
              busy={settingsMutation.isPending || actionMutation.isPending}
              onSave={() => settingsMutation.mutate()}
              onSync={() => actionMutation.mutate({ path: "/api/football/sync-fixtures" })}
            />
          )}

          {tab === "logs" && <LogsPanel logs={logsQuery.data?.apiUsage ?? []} collectorLogs={logsQuery.data?.logs ?? []} loading={logsQuery.isLoading} />}
        </div>
        </div>
      </div>

      {selectedFixtureId && (
        <FixtureDetailModal
          fixture={fixtureDetailQuery.data}
          loading={fixtureDetailQuery.isLoading}
          error={fixtureDetailQuery.error instanceof Error ? fixtureDetailQuery.error.message : ""}
          onClose={() => setSelectedFixtureId("")}
        />
      )}
    </main>
  );
}

function Header({ onLogout, darkMode, onToggleTheme }: { onLogout?: () => void; darkMode: boolean; onToggleTheme: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-teal-200 bg-teal-50 text-teal-800">F</span>
          <span className="truncate">Trading platform <span className="px-1 text-slate-300">/</span> Football</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {onLogout && <button onClick={onLogout} className="h-9 rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700">Ngắt kết nối</button>}
          <Link href="/" className="hidden h-9 items-center gap-2 rounded bg-slate-900 px-3 text-sm font-semibold text-white sm:inline-flex"><ArrowLeft size={15} /> Trading desk</Link>
          <button type="button" onClick={onToggleTheme} aria-label={darkMode ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} aria-pressed={darkMode} title={darkMode ? "Giao diện sáng" : "Giao diện tối"} className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</p></div>;
}

function QuotaBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return <div className="mt-4">
    <div className="flex justify-between text-xs"><span className="font-medium text-slate-700">{label}</span><span className="tabular-nums text-slate-500">{used} / {limit}</span></div>
    <div className="mt-1.5 h-2 overflow-hidden rounded bg-slate-100"><div className={`h-full rounded ${percent >= 85 ? "bg-amber-500" : "bg-teal-700"}`} style={{ width: `${percent}%` }} /></div>
  </div>;
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return <div className="mb-4 flex items-start justify-between gap-3 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><span className="flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" />{message}</span><button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-rose-700"><X size={16} /></button></div>;
}

function ExternalFixtureRadar({
  mode,
  setMode,
  page,
  setPage,
  fixtures,
  total,
  fetchedAt,
  loading,
  error,
  busy,
  onRefresh,
  onTrack,
  onCancel,
  onView,
}: {
  mode: "LIVE" | "UPCOMING";
  setMode: (mode: "LIVE" | "UPCOMING") => void;
  page: number;
  setPage: (page: number) => void;
  fixtures: Array<Fixture & {
    id: string | null;
    leagueName: string;
    leagueCountry: string | null;
    snapshotCount: number;
  }>;
  total: number;
  fetchedAt: string | null;
  loading: boolean;
  error: string;
  busy: boolean;
  onRefresh: () => void;
  onTrack: (fixture: Fixture) => void;
  onCancel: (trackingId: string) => void;
  onView: (fixtureId: string) => void;
}) {
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(fixtures.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleFixtures = fixtures.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">Live Radar · ngoài 9 giải chính</h2>
          <p className="mt-1 text-xs text-slate-500">Tìm trận toàn bộ giải API-Football. Chọn trận live hoặc lên lịch ghi odds khi trận bắt đầu.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode("LIVE")}
            aria-pressed={mode === "LIVE"}
            className={["h-9 rounded border px-3 text-xs font-semibold", mode === "LIVE" ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-600"].join(" ")}
          >
            Đang live
          </button>
          <button
            onClick={() => setMode("UPCOMING")}
            aria-pressed={mode === "UPCOMING"}
            className={["h-9 rounded border px-3 text-xs font-semibold", mode === "UPCOMING" ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-600"].join(" ")}
          >
            Sắp live · 48 giờ
          </button>
          <button onClick={onRefresh} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Tải lại
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
        <span>{total} trận tìm được · hiển thị {fixtures.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, fixtures.length)}</span>
        <span>{fetchedAt ? "Cập nhật " + formatDate(fetchedAt) : "Chưa tải danh sách"}</span>
      </div>
      {error && <p className="m-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading && fixtures.length === 0 && <p className="p-12 text-center text-sm text-slate-500">Đang lấy danh sách từ API-Football…</p>}
      {!loading && !error && fixtures.length === 0 && (
        <p className="p-12 text-center text-sm text-slate-500">
          {mode === "LIVE" ? "Hiện API chưa trả trận live ngoài 9 giải chính." : "Không có trận nào bắt đầu trong 48 giờ tới ngoài 9 giải chính."}
        </p>
      )}
      {fixtures.length > 0 && (
        <div className="divide-y divide-slate-100">
          {visibleFixtures.map((fixture) => (
            <article key={fixture.providerFixtureId} className="grid gap-3 p-4 lg:grid-cols-[1.5fr_1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {fixture.leagueName}{fixture.leagueCountry ? " · " + fixture.leagueCountry : ""}
                  </span>
                  <span className={["rounded border px-2 py-0.5 text-[10px] font-semibold", statusClass(fixture.status)].join(" ")}>{statusLabel(fixture.status)}</span>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">{fixture.homeTeamName} {fixture.homeScore ?? "—"} – {fixture.awayScore ?? "—"} {fixture.awayTeamName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  <span className={mode === "UPCOMING" && isUpcomingBeforeTomorrowMorning(fixture.kickoffAt) ? "font-semibold text-amber-600" : undefined}>
                    {mode === "UPCOMING" || fixture.elapsedMinute === null
                      ? "Bắt đầu " + formatDate(fixture.kickoffAt, { weekday: "short", year: "numeric" })
                      : fixture.elapsedMinute + "′"}
                  </span>
                  {" · Fixture #" + fixture.providerFixtureId}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {fixture.liveTracking?.isEnabled
                  ? <button onClick={() => onCancel(fixture.liveTracking!.id)} disabled={busy} className="h-9 rounded border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 disabled:opacity-50">Đang ghi · Dừng</button>
                  : <button onClick={() => onTrack(fixture)} disabled={busy} className="h-9 rounded border border-teal-700 bg-teal-700 px-3 text-xs font-semibold text-white disabled:opacity-50">Ghi Live Odds</button>}
                {fixture.id && <button onClick={() => onView(fixture.id!)} className="h-9 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700">Lịch sử</button>}
              </div>
              <div className="text-xs text-slate-500 lg:text-right">
                {fixture.snapshotCount > 0 ? fixture.snapshotCount + " snapshots đã lưu" : "Chưa có snapshot"}
              </div>
            </article>
          ))}
        </div>
      )}
      {pageCount > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-8 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40">Trang trước</button>
          <span className="text-xs text-slate-500">Trang {currentPage} / {pageCount}</span>
          <button onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} className="h-8 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40">Trang sau</button>
        </div>
      )}
    </section>
  );
}

function TestPanel({
  fixtureIdDraft,
  setFixtureIdDraft,
  searchQuery,
  setSearchQuery,
  testFixtures,
  selectedFixture,
  result,
  markets,
  bookmakerName,
  dataStatus,
  busy,
  onFindLive,
  onSearchFixtures,
  onTrackFixture,
  onSelectFixture,
  onFetchOdds,
  onSaveSnapshot,
}: {
  fixtureIdDraft: string;
  setFixtureIdDraft: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  testFixtures: Fixture[];
  selectedFixture: Fixture | null;
  result: { raw: unknown; normalized: { values: OddsValue[] } } | null;
  markets: Array<[string, string | null, string | null, string | null]>;
  bookmakerName: string | null;
  dataStatus: string | null;
  busy: boolean;
  onFindLive: () => void;
  onSearchFixtures: () => void;
  onTrackFixture: (fixture: Fixture) => void;
  onSelectFixture: (fixture: Fixture) => void;
  onFetchOdds: (event: FormEvent<HTMLFormElement>) => void;
  onSaveSnapshot: () => void;
}) {
  const hasOdds = Boolean(result?.normalized.values.length);
  return <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
    <div className="space-y-4">
      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-950">Test mode</h2>
        <p className="mt-1 text-sm leading-5 text-slate-600">Tìm trận live hoặc sắp diễn ra ngoài 9 giải chính. Trận test chỉ được theo dõi sau khi bạn bấm.</p>
        <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm theo tên đội (không bắt buộc)" className="mt-4 h-10 w-full rounded border border-slate-300 px-3 text-sm" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={onFindLive} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-slate-900 px-3 text-xs font-semibold text-white"><Search size={15} /> Tìm live</button>
          <button onClick={onSearchFixtures} disabled={busy} className="inline-flex h-10 items-center justify-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700"><Clock3 size={15} /> Tìm 3 ngày</button>
        </div>
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trận tìm được từ API-Football</p>
          {testFixtures.length ? <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">{testFixtures.map((fixture) => <div key={fixture.providerFixtureId} className={`rounded border p-3 ${selectedFixture?.providerFixtureId === fixture.providerFixtureId ? "border-teal-600 bg-teal-50/50" : "border-slate-200 bg-white"}`}>
            <button onClick={() => onSelectFixture(fixture)} className="w-full text-left"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-800">{fixture.homeTeamName} — {fixture.awayTeamName}</span><span className="shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{fixture.status}{fixture.elapsedMinute ? ` ${fixture.elapsedMinute}′` : ""}</span></div>
              <p className="mt-1 text-[11px] text-slate-500">League {fixture.providerLeagueId} · Fixture #{fixture.providerFixtureId} · {formatDate(fixture.kickoffAt)}</p>
            </button>
            <button onClick={() => onTrackFixture(fixture)} disabled={busy || ["FT", "AET", "PEN", "PST", "CANC", "ABD", "AWD", "WO"].includes(fixture.status)} className="mt-2 h-7 rounded border border-teal-700 px-2 text-[11px] font-semibold text-teal-800 disabled:opacity-40">Thêm vào Live Tracking</button>
          </div>)}</div> : <p className="mt-2 rounded border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">Nhấn Tìm live hoặc Tìm 3 ngày để tra trận thật từ API.</p>}
        </div>
      </section>
      <section className="rounded border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-950">Nhập fixture ID</h3>
        <form className="mt-3 space-y-3" onSubmit={onFetchOdds}>
          <input value={fixtureIdDraft} onChange={(event) => setFixtureIdDraft(event.target.value)} inputMode="numeric" placeholder="Ví dụ: 123456" className="h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-teal-700" />
          <button disabled={busy || !fixtureIdDraft} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-800"><Activity size={16} /> Test Live Odds</button>
        </form>
      </section>
      {selectedFixture && <section className="rounded border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đang chọn</p><div className="mt-2"><FixtureTeams fixture={selectedFixture} /></div><p className="mt-2 text-xs text-slate-500">{formatDate(selectedFixture.kickoffAt, { timeZone: "Asia/Ho_Chi_Minh" })} · #{selectedFixture.providerFixtureId}</p></section>}
    </div>

    <section className="min-h-[560px] rounded border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold text-slate-950">Live odds response</h2><p className="mt-1 text-xs text-slate-500">Chỉ hiển thị AH / OU H1 và FT đã nhận diện.</p></div>
        {result && <button onClick={onSaveSnapshot} disabled={busy || !hasOdds} className="inline-flex h-9 items-center justify-center gap-2 rounded bg-teal-700 px-3 text-sm font-semibold text-white"><Database size={15} /> Save Snapshot</button>}
      </div>
      {!result ? <div className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center"><div className="flex h-12 w-12 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500"><Activity size={20} /></div><p className="mt-3 text-sm font-semibold text-slate-700">Chưa có dữ liệu odds</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">Chọn trận live hoặc nhập fixture ID để gọi API. Mỗi request đều đi qua quota manager và được ghi log.</p></div> : <div className="space-y-5 p-4">
        <div className={`rounded border p-3 text-sm ${hasOdds ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          {hasOdds ? "Đã nhận odds từ provider." : "Provider trả response rỗng hoặc chưa có market odds cho fixture này. Đây không được xem là lỗi hệ thống."}
        </div>
        <section className="overflow-hidden rounded border border-slate-200">
          <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"><span>Bookmaker: <strong className="text-slate-800">{bookmakerName ?? "—"}</strong></span><span>Data: <strong className="text-slate-800">{dataStatus ?? "—"}</strong></span></div>
          <table className="w-full text-sm"><thead className="text-xs text-slate-500"><tr><th className="px-3 py-2 text-left font-medium">Kèo</th><th className="px-3 py-2 text-left font-medium">Line</th><th className="px-3 py-2 text-right font-medium">Nhà / Over</th><th className="px-3 py-2 text-right font-medium">Khách / Under</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{markets.map(([market, line, firstPrice, secondPrice]) => <tr key={market}><td className="px-3 py-2 font-semibold text-slate-800">{market}</td><td className="px-3 py-2 tabular-nums text-slate-700">{line ?? "—"}</td><td className="px-3 py-2 text-right tabular-nums text-slate-800">{firstPrice ?? "—"}</td><td className="px-3 py-2 text-right tabular-nums text-slate-800">{secondPrice ?? "—"}</td></tr>)}</tbody>
          </table>
        </section>
      </div>}
    </section>
  </div>;
}

function LiveRecordingPanel({ trackings, loading, refreshing, onRefresh, onView, onCancel, busy }: {
  trackings: TrackingRow[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onView: (fixtureId: string) => void;
  onCancel: (trackingId: string) => void;
  busy: boolean;
}) {
  return <section className="overflow-hidden rounded border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
      <div><h2 className="font-semibold text-slate-950">Live Recording</h2><p className="mt-1 text-xs text-slate-500">Tự refresh mỗi 15 giây. {trackings.filter((item) => item.status === "RECORDING").length} trận đang ghi.</p></div>
      <button onClick={onRefresh} className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Tải lại</button>
    </div>
    <div className="table-scroll overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Trận đấu</th><th className="px-4 py-3">Ngày giờ</th><th className="px-4 py-3">Tỷ số (góc)</th><th className="px-4 py-3 text-right">Snapshots</th><th className="px-4 py-3">Ghi gần nhất</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {trackings.map((tracking) => <Fragment key={tracking.id}>
            <tr className="hover:bg-slate-50/70">
              <td className="px-4 py-3"><FixtureTeams fixture={tracking.fixture} />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${statusClass(tracking.status === "RECORDING" ? tracking.fixture.status : tracking.status)}`}>{tracking.status}</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${statusClass(tracking.fixture.status)}`}>{statusLabel(tracking.fixture.status)}{formatTrackingMinute(tracking.fixture) ? ` · ${formatTrackingMinute(tracking.fixture)}′` : ""}</span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Fixture #{tracking.fixture.providerFixtureId}</p>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{formatFixtureDateTime(tracking.fixture.kickoffAt)}</td>
              <td className="px-4 py-3 font-semibold tabular-nums">
                <div>{tracking.fixture.homeScore ?? "—"}-{tracking.fixture.awayScore ?? "—"}</div>
                <div className="mt-0.5 text-xs font-normal text-slate-500">{tracking.latestHomeCornerKicks != null && tracking.latestAwayCornerKicks != null ? `(${tracking.latestHomeCornerKicks}-${tracking.latestAwayCornerKicks})` : "(—)"}</div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums"><div>{tracking.snapshotCount}</div><div className="mt-0.5 text-xs font-normal text-slate-500">Thiếu / bỏ lỡ: {tracking.missingSnapshotCount}</div></td>
              <td className="px-4 py-3 text-xs text-slate-600"><div>{tracking.latestOddsAt ? formatDate(tracking.latestOddsAt) : "—"}</div><div className="mt-0.5 text-slate-400">{tracking.lastSlot ? `${tracking.lastSlot.slotKey} · ${tracking.lastSlot.status}` : "Chưa có mốc"}</div></td>
              <td className="px-4 py-3 text-right"><div className="flex flex-wrap justify-end gap-2"><button onClick={() => onView(tracking.fixture.id)} className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-300 px-2.5 text-xs font-semibold text-slate-700"><Eye size={14} /> Xem odds</button><button onClick={() => onCancel(tracking.id)} disabled={busy} className="h-8 rounded border border-rose-200 bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 disabled:opacity-50">Dừng theo dõi</button></div></td>
            </tr>
            {tracking.lastError && <tr><td colSpan={6} className="px-4 pb-3 pt-0"><p className="rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{tracking.lastError}</p></td></tr>}
          </Fragment>)}
          {loading && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">Đang tải tracking…</td></tr>}
          {!loading && !trackings.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">Chưa có trận nào được bật Live Tracking. Mở Trận đấu hoặc Live Radar để chọn trận; odds đã lưu có thể xem tại Lịch sử odds.</td></tr>}
        </tbody>
      </table>
    </div>
  </section>;
}

function MissingResultsPanel({ fixtures, loading, drafts, setDrafts, onSync, onSave, onView, busy }: {
  fixtures: MissingResultRow[];
  loading: boolean;
  drafts: Record<number, { homeScoreHt: string; awayScoreHt: string; homeScoreFt: string; awayScoreFt: string }>;
  setDrafts: (value: Record<number, { homeScoreHt: string; awayScoreHt: string; homeScoreFt: string; awayScoreFt: string }>) => void;
  onSync: (fixtureId: number) => void;
  onSave: (fixture: MissingResultRow) => void;
  onView: (fixtureId: string) => void;
  busy: boolean;
}) {
  const fields = ["homeScoreHt", "awayScoreHt", "homeScoreFt", "awayScoreFt"] as const;
  const labels: Record<(typeof fields)[number], string> = { homeScoreHt: "HT nhà", awayScoreHt: "HT khách", homeScoreFt: "FT nhà", awayScoreFt: "FT khách" };
  return <section className="rounded border border-slate-200 bg-white">
    <div className="border-b border-slate-200 p-4"><h2 className="font-semibold text-slate-950">Missing Results</h2><p className="mt-1 text-xs text-slate-500">Chỉ gồm trận đã có odds snapshot nhưng chưa đủ tỉ số HT/FT.</p></div>
    <div className="divide-y divide-slate-100">
      {fixtures.map((fixture) => {
        const current = drafts[fixture.providerFixtureId] ?? { homeScoreHt: "", awayScoreHt: "", homeScoreFt: "", awayScoreFt: "" };
        return <article key={fixture.id} className="grid gap-3 p-4 xl:grid-cols-[1.1fr_1fr_auto] xl:items-center">
          <div><span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{getFootballLeague(fixture.providerLeagueId)?.shortName ?? `League ${fixture.providerLeagueId}`}</span><p className="mt-2 text-sm font-semibold text-slate-900">{fixture.homeTeamName} — {fixture.awayTeamName}</p><p className="mt-1 text-xs text-slate-500">{formatDate(fixture.kickoffAt)} · {fixture.status} · {fixture.snapshotCount} odds snapshots</p><button onClick={() => onView(fixture.id)} className="mt-2 text-xs font-semibold text-teal-800">Xem lịch sử odds</button></div>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((field) => <label key={field} className="text-[10px] font-semibold text-slate-500">{labels[field]}<input type="number" min="0" max="99" value={current[field]} onChange={(event) => setDrafts({ ...drafts, [fixture.providerFixtureId]: { ...current, [field]: event.target.value } })} className="mt-1 h-9 w-full rounded border border-slate-300 px-2 text-sm text-slate-900" /></label>)}
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end"><button onClick={() => onSync(fixture.providerFixtureId)} disabled={busy} className="h-9 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 disabled:opacity-50">Sync từ API</button><button onClick={() => onSave(fixture)} disabled={busy || fields.some((field) => current[field] === "")} className="h-9 rounded bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50">Lưu HT / FT</button></div>
        </article>;
      })}
      {loading && <p className="p-12 text-center text-sm text-slate-500">Đang tải kết quả…</p>}
      {!loading && fixtures.length === 0 && <p className="p-12 text-center text-sm text-slate-500">Không có trận nào đang thiếu kết quả.</p>}
    </div>
  </section>;
}

function SystemStatusPanel({ checks, collector, collectorLoading, leagues, onCheckApi, onCheckDatabase, onCheckCollector, onVerifyLeagues, onToggleLeague, busy }: {
  checks: Record<string, SystemCheck>;
  collector?: SystemCheck;
  collectorLoading: boolean;
  leagues: Array<{ key: string; apiLeagueId: number; name: string; shortName: string; country: string; isEnabled: boolean; verifiedAt: string | null; upcomingCount: number; recordingCount: number; status: string }>;
  onCheckApi: () => void;
  onCheckDatabase: () => void;
  onCheckCollector: () => void;
  onVerifyLeagues: () => void;
  onToggleLeague: (leagueId: number, enabled: boolean) => void;
  busy: string;
}) {
  const cards = [
    { key: "api", title: "API-Football", action: onCheckApi, button: "Connect to API", check: checks.api },
    { key: "database", title: "MySQL / Prisma", action: onCheckDatabase, button: "Connect to MySQL", check: checks.database },
    { key: "collector", title: "Background collector", action: onCheckCollector, button: "Check Collector", check: collector },
  ];
  const verified = (checks.verify?.verified as Array<{ key: string; apiLeagueId: number; verified: boolean; providerName: string | null }> | undefined) ?? [];
  return <div className="space-y-5">
    <div className="grid auto-rows-fr items-stretch gap-3 lg:grid-cols-3">
      {cards.map((card) => <section key={card.key} className="flex h-full flex-col rounded border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">{card.title}</h2><p className="mt-1 text-xs text-slate-500">{card.check?.status ?? (card.key === "collector" && collectorLoading ? "Checking…" : "Chưa kiểm tra")}</p></div><span className={`rounded border px-2 py-1 text-[10px] font-bold ${card.check?.status === "CONNECTED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : card.check?.status === "RATE_LIMITED" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{String(card.check?.status ?? "UNKNOWN")}</span></div>
        <button onClick={card.action} disabled={busy === card.key || (card.key === "collector" && collectorLoading)} className="mt-4 h-9 rounded bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50">{busy === card.key ? "Đang kiểm tra…" : card.button}</button>
        {card.check?.message && <p className="mt-3 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{String(card.check.message)}</p>}
        {card.key === "api" && card.check && <dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><HealthField label="HTTP" value={card.check.httpStatus} /><HealthField label="Response" value={card.check.responseTimeMs == null ? null : `${card.check.responseTimeMs} ms`} /><HealthField label="Daily limit" value={card.check.dailyLimit} /><HealthField label="Remaining" value={card.check.requestsRemaining} /><HealthField label="Minute limit" value={card.check.minuteLimit} /><HealthField label="Minute remaining" value={card.check.minuteRemaining} /><HealthField label="Last check" value={card.check.lastCheckedAt} /></dl>}
        {card.key === "database" && card.check && <dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><HealthField label="SELECT 1" value={card.check.status === "CONNECTED" ? "OK" : "—"} /><HealthField label="Response" value={card.check.responseTimeMs == null ? null : `${card.check.responseTimeMs} ms`} /><HealthField label="Checked" value={card.check.checkedAt} /></dl>}
        {card.key === "collector" && card.check && <dl className="mt-3 grid grid-cols-2 gap-2 text-xs"><HealthField label="Heartbeat" value={card.check.heartbeatAt} /><HealthField label="Đang ghi" value={card.check.recordingCount} /><HealthField label="Chờ bắt đầu" value={card.check.waitingCount} /><HealthField label="Quota" value={card.check.quotaStatus} /><HealthField label="Odds gần nhất" value={card.check.lastSuccessfulCollectionAt} /></dl>}
      </section>)}
    </div>
    <section className="rounded border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4"><div><h2 className="font-semibold text-slate-950">9 giải chính</h2><p className="mt-1 text-xs text-slate-500">WAITING nghĩa là chưa có trận được ghi odds; không phải lỗi API. Verify ID gọi `/leagues?id=…` và dùng một request quota cho mỗi giải.</p></div><button onClick={onVerifyLeagues} disabled={busy === "verify"} className="h-9 rounded border border-teal-700 px-3 text-xs font-semibold text-teal-800 disabled:opacity-50">{busy === "verify" ? "Đang gọi provider…" : "Verify 9 League IDs"}</button></div>
      {checks.verify?.message && <p className="m-4 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{String(checks.verify.message)}</p>}
      <div className="grid auto-rows-fr gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {leagues.map((league) => {
          const provider = verified.find((item) => item.key === league.key);
          return <div key={league.key} className="flex h-full flex-col rounded border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-800">{league.shortName} · {league.country}</p><p className="mt-1 text-xs text-slate-500">{league.name} · API ID {league.apiLeagueId}</p></div><div className="flex flex-wrap justify-end gap-1"><span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${league.status === "LIVE" ? "border-teal-200 bg-teal-50 text-teal-800" : league.status === "ERROR" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{league.status}</span><span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${provider?.verified || league.verifiedAt ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>{provider?.verified || league.verifiedAt ? "ID verified" : "ID chưa xác minh"}</span></div></div>
            {provider?.providerName && <p className="mt-1 text-[11px] text-slate-500">Provider: {provider.providerName}</p>}
            <p className="mt-1 text-xs text-slate-500">{league.upcomingCount} upcoming · {league.recordingCount} recording</p>
            <button onClick={() => onToggleLeague(league.apiLeagueId, !league.isEnabled)} disabled={busy === `league-${league.apiLeagueId}`} className={`mt-auto h-8 rounded border px-2.5 text-xs font-semibold ${league.isEnabled ? "border-teal-200 bg-teal-50 text-teal-800" : "border-slate-300 bg-white text-slate-600"}`}>{league.isEnabled ? "Đang bật · Tắt" : "Đang tắt · Bật"}</button>
          </div>;
        })}
      </div>
    </section>
  </div>;
}

function HealthField({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded bg-slate-50 p-2"><dt className="text-[10px] uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-all font-semibold text-slate-800">{value == null || value === "" ? "—" : String(value)}</dd></div>;
}

function SettingsPanel({
  settings,
  draft,
  setDraft,
  busy,
  onSave,
  onSync,
}: {
  settings?: Settings;
  draft: FootballSettingsDraft;
  setDraft: (value: FootballSettingsDraft) => void;
  busy: boolean;
  onSave: () => void;
  onSync: () => void;
}) {
  return <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
    <section className="rounded border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-950">Collector settings</h2><p className="mt-1 text-sm text-slate-600">Chọn các giải sẽ đồng bộ lịch và theo dõi live odds.</p></div><Settings2 size={18} className="text-teal-700" /></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded border border-slate-200 p-3 text-sm font-semibold text-slate-800 sm:col-span-2">
          <input type="checkbox" checked={draft.isCollectorEnabled} onChange={(event) => setDraft({ ...draft, isCollectorEnabled: event.target.checked })} className="h-4 w-4 accent-teal-700" />
          Bật toàn bộ background collector
          <span className="ml-auto text-xs font-normal text-slate-500">Tắt sẽ pause tracking; không xóa lịch sử.</span>
        </label>
        <label className="text-sm font-medium text-slate-700">Season start year
          <input type="number" min={1900} max={2100} value={draft.season} onChange={(event) => setDraft({ ...draft, season: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700" />
        </label>
        <label className="text-sm font-medium text-slate-700">Live polling interval (seconds)
          <select value={draft.pollingIntervalSeconds} onChange={(event) => setDraft({ ...draft, pollingIntervalSeconds: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700">
            {[300, 600, 900, 1800, 3600].map((seconds) => <option key={seconds} value={seconds}>{seconds / 60} phút</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Odds snapshot interval (minutes)
          <select value={draft.oddsIntervalMinutes} onChange={(event) => setDraft({ ...draft, oddsIntervalMinutes: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm">
            {[1, 5, 10, 15].map((minutes) => <option key={minutes} value={minutes}>{minutes} phút{minutes === 1 ? " · kiểm thử" : ""}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Fixture sync interval (hours)
          <select value={draft.fixtureSyncIntervalHours} onChange={(event) => setDraft({ ...draft, fixtureSyncIntervalHours: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm">
            {[3, 6, 12, 24].map((hours) => <option key={hours} value={hours}>{hours} giờ</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Status check interval (seconds)
          <select value={draft.statusCheckIntervalSeconds} onChange={(event) => setDraft({ ...draft, statusCheckIntervalSeconds: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm">
            {[60, 300, 900].map((seconds) => <option key={seconds} value={seconds}>{seconds} giây</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">Preferred bookmaker ID
          <input type="number" min="1" value={draft.preferredBookmakerId ?? ""} onChange={(event) => setDraft({ ...draft, preferredBookmakerId: event.target.value ? Number(event.target.value) : null })} placeholder="Tự chọn nguồn đầu tiên" className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm" />
        </label>
        <label className="text-sm font-medium text-slate-700">Daily total cap (max 7,500)
          <input type="number" min={1} max={7500} value={draft.dailyTotalLimit} onChange={(event) => setDraft({ ...draft, dailyTotalLimit: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700" />
        </label>
        <label className="text-sm font-medium text-slate-700">Live odds budget
          <input type="number" min={0} max={7500} value={draft.dailyOddsBudget} onChange={(event) => setDraft({ ...draft, dailyOddsBudget: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700" />
        </label>
        <label className="text-sm font-medium text-slate-700">Reserved budget
          <input type="number" min={0} max={7500} value={draft.dailyReservedBudget} onChange={(event) => setDraft({ ...draft, dailyReservedBudget: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700" />
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold text-slate-800">Giải đấu cần thu thập ({draft.leagueIds.length}/{FOOTBALL_LEAGUES.length})</legend>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {FOOTBALL_LEAGUES.map((league) => {
              const selected = draft.leagueIds.includes(league.id);
              return (
                <label key={league.id} className={`flex cursor-pointer items-center gap-3 rounded border p-3 ${selected ? "border-teal-300 bg-teal-50/50" : "border-slate-200 bg-white"}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => setDraft({
                      ...draft,
                      leagueIds: event.target.checked
                        ? [...draft.leagueIds, league.id]
                        : draft.leagueIds.filter((id) => id !== league.id),
                    })}
                    className="h-4 w-4 accent-teal-700"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{league.top}. {league.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{league.country} · {league.shortName} · ID {league.id}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button disabled={busy || !settings} onClick={onSave} className="inline-flex h-10 items-center gap-2 rounded bg-slate-900 px-4 text-sm font-semibold text-white"><Check size={15} /> Lưu cấu hình</button>
        <button disabled={busy || !draft.leagueIds.length} onClick={onSync} className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"><RefreshCw size={15} /> Manual Sync Fixtures</button>
      </div>
    </section>
    <aside className="rounded border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-950">Quota protection</h3>
      <dl className="mt-3 divide-y divide-slate-100 text-sm">
        <div className="flex justify-between py-2"><dt className="text-slate-500">Daily total</dt><dd className="font-semibold text-slate-800">{settings?.dailyTotalLimit ?? 7500} requests</dd></div>
        <div className="flex justify-between py-2"><dt className="text-slate-500">Live odds budget</dt><dd className="font-semibold text-slate-800">{settings?.dailyOddsBudget ?? 6000}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-slate-500">Reserved budget</dt><dd className="font-semibold text-slate-800">{settings?.dailyReservedBudget ?? 1500}</dd></div>
        <div className="flex justify-between py-2"><dt className="text-slate-500">Reset timezone</dt><dd className="font-semibold text-slate-800">{settings?.quotaResetTimezone ?? "UTC"}</dd></div>
      </dl>
      <p className="mt-3 rounded border border-teal-100 bg-teal-50 p-3 text-xs leading-5 text-teal-900">Mặc định dùng tối đa 7.500 request/ngày theo gói Pro: 6.000 cho live odds và 1.500 cho lịch/trạng thái, dùng chung giữa 9 giải chính và các trận thêm từ Live Radar. Quota API/provider vẫn là giới hạn cuối; collector tự giảm nhịp khi gần cạn.</p>
    </aside>
  </div>;
}

function LogsPanel({ logs, collectorLogs, loading }: { logs: Array<Record<string, unknown>>; collectorLogs: Array<Record<string, unknown>>; loading: boolean }) {
  return <div className="space-y-5">
  <section className="rounded border border-slate-200 bg-white">
    <div className="border-b border-slate-200 p-4"><h2 className="font-semibold text-slate-950">API usage</h2><p className="mt-1 text-xs text-slate-500">Lịch sử API calls, latency, HTTP status, quota daily và minute. Log không chứa API key.</p></div>
    <div className="table-scroll overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3 font-semibold">Requested at</th><th className="px-4 py-3 font-semibold">Endpoint</th><th className="px-4 py-3 font-semibold">Mode</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Duration</th><th className="px-4 py-3 text-right font-semibold">Quota left</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{logs.map((log) => <tr key={String(log.id)}><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(String(log.requestedAt), { year: undefined })}</td><td className="px-4 py-3 font-mono text-xs text-slate-700">{String(log.endpoint)}</td><td className="px-4 py-3 text-xs text-slate-600">{String(log.requestType)}</td><td className="px-4 py-3"><span className={`rounded border px-2 py-1 text-xs font-semibold ${log.success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{log.success ? String(log.statusCode ?? "OK") : String(log.statusCode ?? "ERROR")}</span>{log.errorMessage ? <p className="mt-1 max-w-sm truncate text-xs text-rose-700" title={String(log.errorMessage)}>{String(log.errorMessage)}</p> : null}</td><td className="px-4 py-3 text-right tabular-nums text-slate-600">{String(log.durationMs)} ms</td><td className="px-4 py-3 text-right tabular-nums text-slate-600">{log.dailyQuotaRemaining == null ? "—" : String(log.dailyQuotaRemaining)}</td></tr>)}
      {loading && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">Đang tải nhật ký…</td></tr>}
      {!loading && logs.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">Chưa có request được ghi nhận.</td></tr>}</tbody>
    </table></div>
  </section>
  <section className="rounded border border-slate-200 bg-white">
    <div className="border-b border-slate-200 p-4"><h2 className="font-semibold text-slate-950">Collector logs</h2><p className="mt-1 text-xs text-slate-500">Recovery, snapshot thiếu, slot bị bỏ lỡ, kết quả và lỗi worker.</p></div>
    <div className="divide-y divide-slate-100">{collectorLogs.map((log) => {
      const tracking = log.tracking as { fixture?: { homeTeamName?: string; awayTeamName?: string; providerFixtureId?: number } } | null;
      return <article key={String(log.id)} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><div><span className={`mr-2 rounded border px-1.5 py-0.5 text-[10px] font-bold ${log.level === "ERROR" ? "border-rose-200 bg-rose-50 text-rose-700" : log.level === "WARN" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>{String(log.level)}</span><span className="font-semibold text-slate-800">{String(log.action)}</span><p className="mt-1 text-xs text-slate-600">{String(log.message)}{tracking?.fixture ? ` · ${tracking.fixture.homeTeamName} – ${tracking.fixture.awayTeamName} (#${tracking.fixture.providerFixtureId})` : ""}</p></div><time className="text-xs text-slate-500">{formatDate(String(log.createdAt))}</time></article>;
    })}{!loading && collectorLogs.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Chưa có log hoạt động của collector.</p>}</div>
  </section>
  </div>;
}

function FixtureDetailModal({ fixture, loading, error, onClose }: { fixture?: FixtureDetails; loading: boolean; error: string; onClose: () => void }) {
  const [showOddsChart, setShowOddsChart] = useState(false);
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, []);

  const snapshots = fixture?.oddsSnapshots ?? [];
  const historySnapshots = [...snapshots].sort((a, b) => {
    if (a.sourceType === "PREMATCH" && b.sourceType !== "PREMATCH") return 1;
    if (b.sourceType === "PREMATCH" && a.sourceType !== "PREMATCH") return -1;
    return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
  });
  const chartMarkets = [
    { key: "ahFtHome", label: "AH FT · Nhà", lineField: "ahFtLine", priceField: "ahFtHomePrice", color: "#0f766e" },
    { key: "ahFtAway", label: "AH FT · Khách", lineField: "ahFtLine", priceField: "ahFtAwayPrice", color: "#2563eb" },
    { key: "ouFtOver", label: "OU FT · Tài", lineField: "ouFtLine", priceField: "ouFtOverPrice", color: "#d97706" },
    { key: "ouFtUnder", label: "OU FT · Xỉu", lineField: "ouFtLine", priceField: "ouFtUnderPrice", color: "#db2777" },
    { key: "cornerAhHtHome", label: "AH góc H1 · Nhà", lineField: "cornerAhHtLine", priceField: "cornerAhHtHomePrice", color: "#0e7490" },
    { key: "cornerAhHtAway", label: "AH góc H1 · Khách", lineField: "cornerAhHtLine", priceField: "cornerAhHtAwayPrice", color: "#6d28d9" },
    { key: "cornerOuHtOver", label: "OU góc H1 · Tài", lineField: "cornerOuHtLine", priceField: "cornerOuHtOverPrice", color: "#c2410c" },
    { key: "cornerOuHtUnder", label: "OU góc H1 · Xỉu", lineField: "cornerOuHtLine", priceField: "cornerOuHtUnderPrice", color: "#be185d" },
    { key: "cornerAhFtHome", label: "AH góc FT · Nhà", lineField: "cornerAhFtLine", priceField: "cornerAhFtHomePrice", color: "#0891b2" },
    { key: "cornerAhFtAway", label: "AH góc FT · Khách", lineField: "cornerAhFtLine", priceField: "cornerAhFtAwayPrice", color: "#7c3aed" },
    { key: "cornerOuFtOver", label: "OU góc FT · Tài", lineField: "cornerOuFtLine", priceField: "cornerOuFtOverPrice", color: "#ea580c" },
    { key: "cornerOuFtUnder", label: "OU góc FT · Xỉu", lineField: "cornerOuFtLine", priceField: "cornerOuFtUnderPrice", color: "#be185d" },
  ] as const;
  const orderedSnapshots = [...snapshots].reverse();
  const chartSeries = chartMarkets.flatMap((market) => {
    const lines = Array.from(new Set(orderedSnapshots
      .map((snapshot) => snapshot[market.lineField])
      .filter((line): line is string | number => line !== null)
      .map(String)));
    return lines.map((line) => ({
      dataKey: `${market.key}_${line.replace(/[^a-z0-9]+/gi, "_")}`,
      marketKey: market.key,
      line,
      name: `${market.label} · line ${line}`,
      color: market.color,
    }));
  });
  const marketCell = (
    line: string | number | null,
    first: string | number | null,
    second: string | number | null,
    firstOutcome?: SettlementStatus,
    secondOutcome?: SettlementStatus,
    handicapLine = false,
  ) => {
    if (line === null && first === null && second === null) return "—";
    const displayLine = handicapLine ? formatHandicapLine(line) : line === null ? "—" : String(line);
    const priceClass = (outcome?: SettlementStatus) => outcome
      ? `${settlementBadgeClass(outcome)} rounded px-0.5 py-px`
      : "";
    return <span className="whitespace-nowrap" title={handicapLine ? "Line nhà cái cho cửa Nhà: âm là Nhà chấp, dương là Nhà được chấp." : undefined}>{displayLine} - <span className={priceClass(firstOutcome)}>{first ?? "—"}</span> / <span className={priceClass(secondOutcome)}>{second ?? "—"}</span></span>;
  };
  const chartData = orderedSnapshots.map((snapshot) => {
    const row: Record<string, string | number> = { time: new Date(snapshot.capturedAt).getTime() };
    for (const series of chartSeries) {
      const market = chartMarkets.find((item) => item.key === series.marketKey);
      if (!market || String(snapshot[market.lineField] ?? "") !== series.line) continue;
      const price = snapshot[market.priceField];
      const numericPrice = Number(price);
      if (price !== null && Number.isFinite(numericPrice) && numericPrice > 1) row[series.dataKey] = numericPrice;
    }
    return row;
  });
  const chartPointCount = chartData.filter((row) => chartSeries.some((series) => typeof row[series.dataKey] === "number")).length;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Fixture details">
    <div className="max-h-[calc(100vh-2rem)] w-full max-w-none overflow-y-auto rounded border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4">
        <div>{fixture ? <><FixtureTeams fixture={fixture} /><p className="mt-2 text-xs text-slate-500">Fixture #{fixture.providerFixtureId} · Kickoff {formatDate(fixture.kickoffAt, { timeZone: "Asia/Ho_Chi_Minh" })}</p></> : <h2 className="font-semibold">Fixture detail</h2>}</div>
        <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600"><X size={16} /></button>
      </div>
      {loading ? <div className="p-12 text-center text-sm text-slate-500">Đang tải fixture…</div> : error ? <div className="p-4 text-sm text-rose-700">{error}</div> : fixture ? <div className="space-y-5 p-2 sm:p-3">
        <div className="grid gap-3 sm:grid-cols-4"><MiniStat label="Trạng thái" value={`${statusLabel(fixture.status)} (${fixture.status})`} /><MiniStat label="Tỷ số" value={`${fixture.homeScore ?? "—"} : ${fixture.awayScore ?? "—"}`} /><MiniStat label="Elapsed" value={fixture.elapsedMinute ? `${fixture.elapsedMinute}′` : "—"} /><MiniStat label="Snapshots" value={String(snapshots.length)} /></div>
        <section className="rounded border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">Biến động odds · AH / OU FT và góc</h3>
            <button type="button" onClick={() => setShowOddsChart((visible) => !visible)} aria-expanded={showOddsChart} className="h-8 shrink-0 rounded border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              {showOddsChart ? "Ẩn biểu đồ" : "Xem biểu đồ"}
            </button>
          </div>
          {showOddsChart && <>
            <p className="mt-2 text-xs text-slate-500">Bi&#7875;u &#273;&#7891; g&#7891;m AH, OU hi&#7879;p 1 v&#224; c&#7843; tr&#7853;n, c&#249;ng k&#232;o g&#243;c hi&#7879;p 1 v&#224; c&#7843; tr&#7853;n; m&#7895;i m&#7889;c hi&#7875;n th&#7883; ri&#234;ng. {chartPointCount} &#273;i&#7875;m c&#243; odds.</p>
            {chartSeries.length && chartPointCount ? <div className="mt-3 h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 11 }} tickFormatter={(value) => formatDate(new Date(value).toISOString(), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} /><Tooltip labelFormatter={(value) => formatDate(new Date(Number(value)).toISOString())} />{chartSeries.map((series) => <Line key={series.dataKey} type="monotone" dataKey={series.dataKey} name={series.name} stroke={series.color} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />)}</LineChart></ResponsiveContainer></div> : <p className="py-10 text-center text-sm text-slate-500">Ch&#432;a c&#243; snapshot numeric cho c&#225;c k&#232;o AH / OU / g&#243;c.</p>}
            <div className="mt-2 flex flex-wrap gap-3">{chartSeries.map((series) => <span key={series.dataKey} className="inline-flex items-center gap-1.5 text-xs text-slate-600"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />{series.name}</span>)}</div>
          </>}
        </section>
        <section className="overflow-hidden rounded border border-slate-200"><div className="border-b border-slate-200 px-1.5 py-2"><h3 className="text-sm font-semibold text-slate-900">Odds History · AH / OU / Góc</h3><p className="mt-1 text-xs text-slate-500">K&#232;o ch&#226;u &#193; v&#224; T&#224;i/X&#7881;u hi&#7875;n th&#7883; m&#7889;c / gi&#225; hai c&#7917;a; k&#232;o g&#243;c g&#7891;m hi&#7879;p 1 v&#224; c&#7843; tr&#7853;n.</p></div><div className="table-scroll overflow-x-auto"><table className="w-full min-w-[1600px] table-fixed text-xs"><colgroup><col style={{ width: "calc(7.514450867052% - 4.208092485549px)" }} /><col style={{ width: "calc(5.780346820809% - 3.236994219653px)" }} /><col style={{ width: "calc(5.780346820809% - 3.236994219653px)" }} /><col style={{ width: "calc(9.248554913295% - 5.179190751445px)" }} /><col style={{ width: "calc(9.248554913295% - 5.179190751445px)" }} /><col style={{ width: "calc(9.248554913295% - 5.179190751445px)" }} /><col style={{ width: "calc(9.248554913295% - 5.179190751445px)" }} /><col style={{ width: "16px" }} /><col style={{ width: "calc(6.936416184971% - 3.884393063584px)" }} /><col style={{ width: "calc(9.248554913295% - 5.179190751445px)" }} /><col style={{ width: "calc(9.248554913295% - 5.179190751445px)" }} /><col style={{ width: "calc(9.248554913295% - 5.179190751445px)" }} /><col style={{ width: "calc(9.248554913295% - 5.179190751445px)" }} /><col style={{ width: "40px" }} /></colgroup><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-1.5 py-2">Slot</th><th className="px-1.5 py-2">Ph&#250;t th&#7921;c</th><th className="px-1.5 py-2"><strong>T&#7927; s&#7889;</strong><br /><span className="font-normal normal-case">Nh&#224; : kh&#225;ch</span></th><th className="px-1.5 py-2"><strong>Ch&#7845;p H1</strong><br /><span className="font-normal normal-case">Ch&#7845;p - Nh&#224;/Kh&#225;ch</span></th><th className="px-1.5 py-2"><strong>T&#224;i/X&#7881;u H1</strong><br /><span className="font-normal normal-case">TX - T&#224;i/X&#7881;u</span></th><th className="px-1.5 py-2"><strong>Ch&#7845;p c&#7843; tr&#7853;n</strong><br /><span className="font-normal normal-case">Ch&#7845;p - Nh&#224;/Kh&#225;ch</span></th><th className="px-1.5 py-2"><strong>T&#224;i/X&#7881;u c&#7843; tr&#7853;n</strong><br /><span className="font-normal normal-case">TX - T&#224;i/X&#7881;u</span></th><th className="px-0 py-2" aria-hidden="true"></th><th className="px-1.5 py-2" title="S&#7889; ph&#7841;t g&#243;c &#273;&#7897;i nh&#224; : &#273;&#7897;i kh&#225;ch t&#7841;i th&#7901;i &#273;i&#7875;m snapshot">G&#243;c hi&#7879;n t&#7841;i<br /><span className="font-normal normal-case">Nh&#224; : kh&#225;ch</span></th><th className="px-1.5 py-2"><strong>Ch&#7845;p g&#243;c H1</strong><br /><span className="font-normal normal-case">Ch&#7845;p - Nh&#224;/Kh&#225;ch</span></th><th className="px-1.5 py-2"><strong>T&#224;i/X&#7881;u g&#243;c H1</strong><br /><span className="font-normal normal-case">TX - T&#224;i/X&#7881;u</span></th><th className="px-1.5 py-2"><strong>Ch&#7845;p g&#243;c c&#7843; tr&#7853;n</strong><br /><span className="font-normal normal-case">Ch&#7845;p - Nh&#224;/Kh&#225;ch</span></th><th className="sticky right-10 top-auto bottom-auto z-20 bg-slate-50 px-1.5 py-2"><strong>T&#224;i/X&#7881;u g&#243;c c&#7843; tr&#7853;n</strong><br /><span className="font-normal normal-case">TX - T&#224;i/X&#7881;u</span></th><th style={{ width: "40px", minWidth: "40px", maxWidth: "40px", boxSizing: "border-box" }} className="sticky right-0 top-auto bottom-auto z-30 w-10 min-w-10 max-w-10 border-l border-slate-200 bg-slate-50 px-1 py-2 text-center">Data</th></tr></thead><tbody className="divide-y divide-slate-100">{historySnapshots.map((snapshot) => <tr key={snapshot.id}><td className="px-1.5 py-2 font-semibold text-slate-800">{snapshot.sourceType === "PREMATCH" ? "PRE-MATCH -10'" : `${snapshot.slotKey ?? snapshot.period ?? "—"} · target ${snapshot.targetMinute ?? "—"}`}</td><td className="px-1.5 py-2 text-center tabular-nums">{snapshot.actualMinute ?? "—"}′</td><td className="px-1.5 py-2 tabular-nums">{snapshot.homeScore ?? "—"} : {snapshot.awayScore ?? "—"}</td><td className="px-1.5 py-2 tabular-nums">{marketCell(snapshot.ahHtLine, snapshot.ahHtHomePrice, snapshot.ahHtAwayPrice, snapshot.settlementData?.ahHtHome, snapshot.settlementData?.ahHtAway, true)}</td><td className="px-1.5 py-2 tabular-nums">{marketCell(snapshot.ouHtLine, snapshot.ouHtOverPrice, snapshot.ouHtUnderPrice, snapshot.settlementData?.ouHtOver, snapshot.settlementData?.ouHtUnder)}</td><td className="px-1.5 py-2 tabular-nums">{marketCell(snapshot.ahFtLine, snapshot.ahFtHomePrice, snapshot.ahFtAwayPrice, snapshot.settlementData?.ahFtHome, snapshot.settlementData?.ahFtAway, true)}</td><td className="px-1.5 py-2 tabular-nums">{marketCell(snapshot.ouFtLine, snapshot.ouFtOverPrice, snapshot.ouFtUnderPrice, snapshot.settlementData?.ouFtOver, snapshot.settlementData?.ouFtUnder)}</td><td className="px-0 py-2" aria-hidden="true"></td><td className="px-1.5 py-2 tabular-nums" title="Phạt góc đội nhà : đội khách">{snapshot.homeCornerKicks ?? "—"} : {snapshot.awayCornerKicks ?? "—"}</td><td className="px-1.5 py-2 tabular-nums">{marketCell(snapshot.cornerAhHtLine, snapshot.cornerAhHtHomePrice, snapshot.cornerAhHtAwayPrice, snapshot.settlementData?.cornerAhHtHome, snapshot.settlementData?.cornerAhHtAway, true)}</td><td className="px-1.5 py-2 tabular-nums">{marketCell(snapshot.cornerOuHtLine, snapshot.cornerOuHtOverPrice, snapshot.cornerOuHtUnderPrice, snapshot.settlementData?.cornerOuHtOver, snapshot.settlementData?.cornerOuHtUnder)}</td><td className="px-1.5 py-2 tabular-nums">{marketCell(snapshot.cornerAhFtLine, snapshot.cornerAhFtHomePrice, snapshot.cornerAhFtAwayPrice, snapshot.settlementData?.cornerAhFtHome, snapshot.settlementData?.cornerAhFtAway, true)}</td><td className="sticky right-10 top-auto bottom-auto z-10 bg-white px-1.5 py-2 tabular-nums">{marketCell(snapshot.cornerOuFtLine, snapshot.cornerOuFtOverPrice, snapshot.cornerOuFtUnderPrice, snapshot.settlementData?.cornerOuFtOver, snapshot.settlementData?.cornerOuFtUnder)}</td><td style={{ width: "40px", minWidth: "40px", maxWidth: "40px", boxSizing: "border-box" }} className="sticky right-0 top-auto bottom-auto z-20 w-10 min-w-10 max-w-10 overflow-hidden border-l border-slate-200 bg-white px-1 py-2 text-center font-semibold" title={snapshot.dataStatus ?? ""} aria-label={snapshot.dataStatus ?? "No data status"}>{snapshot.dataStatus ? snapshot.dataStatus.slice(0, 1).toUpperCase() : "—"}</td></tr>)}</tbody></table></div></section>
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Các giá trị trong bảng là giá kèo do provider trả về, không phải xác suất người chơi đặt cược. Nội dung market được giữ theo tên và cấu trúc nguồn.</p>
      </div> : null}
    </div>
  </div>;
}
