UPDATE FootballCollectorJob
SET
  dailyTotalLimit = 7500,
  dailyOddsBudget = 6000,
  dailyReservedBudget = 1500
WHERE
  dailyTotalLimit = 100
  AND dailyOddsBudget = 80
  AND dailyReservedBudget = 20;

ALTER TABLE FootballCollectorJob
  ALTER COLUMN dailyTotalLimit SET DEFAULT 7500,
  ALTER COLUMN dailyOddsBudget SET DEFAULT 6000,
  ALTER COLUMN dailyReservedBudget SET DEFAULT 1500;
