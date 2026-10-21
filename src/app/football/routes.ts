export const FOOTBALL_TAB_SEGMENTS = {
  overview: "",
  fixtures: "match",
  radar: "live-radar",
  live: "live-recording",
  history: "odds-history",
  analytics: "analytics",
  results: "missing-results",
  system: "system-status",
  test: "api-check",
  settings: "settings",
  logs: "logs",
} as const;

export type FootballTab = keyof typeof FOOTBALL_TAB_SEGMENTS;

export const FOOTBALL_TAB_PATHS: Record<FootballTab, string> = Object.fromEntries(
  Object.entries(FOOTBALL_TAB_SEGMENTS).map(([tab, segment]) => [
    tab,
    segment ? `/football/${segment}` : "/football",
  ]),
) as Record<FootballTab, string>;

export function footballTabFromSegment(segment: string): FootballTab | null {
  const entry = Object.entries(FOOTBALL_TAB_SEGMENTS).find(([, value]) => value === segment);
  return entry ? entry[0] as FootballTab : null;
}
