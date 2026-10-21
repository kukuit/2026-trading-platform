ALTER TABLE `FootballOddsSnapshot`
  ADD COLUMN `cornerAhHtLine` DECIMAL(10, 4) NULL,
  ADD COLUMN `cornerAhHtHomePrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `cornerAhHtAwayPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `cornerOuHtLine` DECIMAL(10, 4) NULL,
  ADD COLUMN `cornerOuHtOverPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `cornerOuHtUnderPrice` DECIMAL(12, 6) NULL;

UPDATE `FootballOddsSnapshot`
SET `dataStatus` = 'PARTIAL'
WHERE `dataStatus` = 'COMPLETE';
