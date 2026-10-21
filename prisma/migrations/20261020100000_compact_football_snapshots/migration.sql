-- Add fields required by current history UI while preserving raw data already
-- stored in the existing database.
ALTER TABLE `FootballOddsSnapshot`
  MODIFY `rawJson` LONGTEXT NULL,
  ADD COLUMN `homeYellowCards` INTEGER NULL,
  ADD COLUMN `awayYellowCards` INTEGER NULL,
  ADD COLUMN `homeRedCards` INTEGER NULL,
  ADD COLUMN `awayRedCards` INTEGER NULL,
  ADD COLUMN `homeCornerKicks` INTEGER NULL,
  ADD COLUMN `awayCornerKicks` INTEGER NULL,
  ADD COLUMN `statisticsCheckedAt` DATETIME(3) NULL;
