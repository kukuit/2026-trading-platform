-- Relevant pre-match corner markets are copied into structured snapshot
-- columns by scripts/football/backfill-legacy-corner-odds.mjs before deploy.
DROP TABLE `FootballOddsValue`;

ALTER TABLE `FootballOddsSnapshot`
  DROP COLUMN `rawJson`;
