export const FOOTBALL_LEAGUES = [
  { top: 1, key: "EPL", id: 39, name: "Premier League", country: "Anh", shortName: "EPL" },
  { top: 2, key: "LALIGA", id: 140, name: "LaLiga", country: "T\u00e2y Ban Nha", shortName: "LaLiga" },
  { top: 3, key: "SERIE_A", id: 135, name: "Serie A", country: "\u00dd", shortName: "Serie A" },
  { top: 4, key: "BUNDESLIGA", id: 78, name: "Bundesliga", country: "\u0110\u1ee9c", shortName: "Bundesliga" },
  { top: 5, key: "LIGUE_1", id: 61, name: "Ligue 1", country: "Ph\u00e1p", shortName: "Ligue 1" },
  { top: 6, key: "LIGA_PORTUGAL", id: 94, name: "Liga Portugal", country: "B\u1ed3 \u0110\u00e0o Nha", shortName: "Liga Portugal" },
  { top: 7, key: "UCL", id: 2, name: "UEFA Champions League", country: "Ch\u00e2u \u00c2u", shortName: "UCL" },
  { top: 8, key: "UEL", id: 3, name: "UEFA Europa League", country: "Ch\u00e2u \u00c2u", shortName: "UEL" },
  { top: 9, key: "UECL", id: 848, name: "UEFA Conference League", country: "Ch\u00e2u \u00c2u", shortName: "UECL" },
] as const;

export type FootballLeague = (typeof FOOTBALL_LEAGUES)[number];

export function getFootballLeague(leagueId: number) {
  return FOOTBALL_LEAGUES.find((league) => league.id === leagueId);
}

export function footballJobName(leagueId: number) {
  return leagueId === 39 ? "production" : `production-${leagueId}`;
}

export function isSupportedFootballLeague(leagueId: number) {
  return FOOTBALL_LEAGUES.some((league) => league.id === leagueId);
}
