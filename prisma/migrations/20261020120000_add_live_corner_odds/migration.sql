ALTER TABLE `FootballOddsSnapshot`
  ADD COLUMN `cornerAhFtLine` DECIMAL(10, 4) NULL,
  ADD COLUMN `cornerAhFtHomePrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `cornerAhFtAwayPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `cornerOuFtLine` DECIMAL(10, 4) NULL,
  ADD COLUMN `cornerOuFtOverPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `cornerOuFtUnderPrice` DECIMAL(12, 6) NULL;

-- Existing COMPLETE snapshots predate corner odds and therefore are partial under the expanded schema.
UPDATE `FootballOddsSnapshot`
SET `dataStatus` = 'PARTIAL'
WHERE `dataStatus` = 'COMPLETE';
