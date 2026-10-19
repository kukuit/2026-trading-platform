CREATE TABLE `FootballLeague` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(32) NOT NULL,
  `apiLeagueId` INTEGER NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `shortName` VARCHAR(64) NOT NULL,
  `country` VARCHAR(100) NOT NULL,
  `season` INTEGER NOT NULL DEFAULT 2026,
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `FootballLeague_key_key` (`key`),
  UNIQUE INDEX `FootballLeague_apiLeagueId_key` (`apiLeagueId`),
  INDEX `FootballLeague_isEnabled_apiLeagueId_idx` (`isEnabled`, `apiLeagueId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `FootballLeague` (`id`, `key`, `apiLeagueId`, `name`, `shortName`, `country`, `season`, `isEnabled`, `updatedAt`) VALUES
  ('football-league-epl', 'EPL', 39, 'Premier League', 'EPL', 'Anh', 2026, true, CURRENT_TIMESTAMP(3)),
  ('football-league-laliga', 'LALIGA', 140, 'LaLiga', 'LaLiga', 'Tây Ban Nha', 2026, true, CURRENT_TIMESTAMP(3)),
  ('football-league-serie-a', 'SERIE_A', 135, 'Serie A', 'Serie A', 'Ý', 2026, true, CURRENT_TIMESTAMP(3)),
  ('football-league-bundesliga', 'BUNDESLIGA', 78, 'Bundesliga', 'Bundesliga', 'Đức', 2026, true, CURRENT_TIMESTAMP(3)),
  ('football-league-ligue-1', 'LIGUE_1', 61, 'Ligue 1', 'Ligue 1', 'Pháp', 2026, true, CURRENT_TIMESTAMP(3)),
  ('football-league-liga-portugal', 'LIGA_PORTUGAL', 94, 'Liga Portugal', 'Liga Portugal', 'Bồ Đào Nha', 2026, true, CURRENT_TIMESTAMP(3)),
  ('football-league-ucl', 'UCL', 2, 'UEFA Champions League', 'UCL', 'Châu Âu', 2026, true, CURRENT_TIMESTAMP(3)),
  ('football-league-uel', 'UEL', 3, 'UEFA Europa League', 'UEL', 'Châu Âu', 2026, true, CURRENT_TIMESTAMP(3)),
  ('football-league-uecl', 'UECL', 848, 'UEFA Conference League', 'UECL', 'Châu Âu', 2026, true, CURRENT_TIMESTAMP(3));

UPDATE `FootballLeague` l
JOIN `FootballCollectorJob` j ON j.`leagueId` = l.`apiLeagueId`
SET l.`isEnabled` = j.`enabled`, l.`season` = j.`season`, l.`updatedAt` = CURRENT_TIMESTAMP(3);

ALTER TABLE `FootballFixture`
  ADD COLUMN `homeScoreHt` INTEGER NULL,
  ADD COLUMN `awayScoreHt` INTEGER NULL,
  ADD COLUMN `homeScoreFt` INTEGER NULL,
  ADD COLUMN `awayScoreFt` INTEGER NULL,
  ADD COLUMN `resultStatus` ENUM('RESULT_PENDING', 'RESULT_COMPLETE', 'RESULT_MISSING', 'RESULT_MANUAL') NOT NULL DEFAULT 'RESULT_PENDING',
  ADD COLUMN `resultSource` VARCHAR(32) NULL,
  ADD COLUMN `resultUpdatedAt` DATETIME(3) NULL,
  ADD COLUMN `elapsedExtraTime` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `leagueCatalogId` VARCHAR(191) NULL,
  ADD INDEX `FootballFixture_leagueCatalogId_kickoffAt_idx` (`leagueCatalogId`, `kickoffAt`),
  ADD CONSTRAINT `FootballFixture_leagueCatalogId_fkey`
    FOREIGN KEY (`leagueCatalogId`) REFERENCES `FootballLeague` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE `FootballFixture` f
JOIN `FootballLeague` l ON l.`apiLeagueId` = f.`providerLeagueId`
SET f.`leagueCatalogId` = l.`id`;

CREATE TABLE `FootballLiveTracking` (
  `id` VARCHAR(191) NOT NULL,
  `fixtureId` VARCHAR(191) NOT NULL,
  `status` ENUM('SCHEDULED', 'RECORDING', 'PAUSED', 'INTERRUPTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `startedAt` DATETIME(3) NULL,
  `lastPolledAt` DATETIME(3) NULL,
  `lastSavedMinute` INTEGER NULL,
  `completedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `FootballLiveTracking_fixtureId_key` (`fixtureId`),
  INDEX `FootballLiveTracking_isEnabled_status_scheduledAt_idx` (`isEnabled`, `status`, `scheduledAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FootballLiveTracking_fixtureId_fkey`
    FOREIGN KEY (`fixtureId`) REFERENCES `FootballFixture` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FootballTrackingSlot` (
  `id` VARCHAR(191) NOT NULL,
  `trackingId` VARCHAR(191) NOT NULL,
  `slotKey` VARCHAR(32) NOT NULL,
  `targetMinute` INTEGER NULL,
  `period` VARCHAR(16) NULL,
  `status` ENUM('PENDING', 'SAVED', 'MISSING', 'MISSED') NOT NULL DEFAULT 'PENDING',
  `actualMinute` INTEGER NULL,
  `capturedAt` DATETIME(3) NULL,
  `error` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `FootballTrackingSlot_trackingId_slotKey_key` (`trackingId`, `slotKey`),
  INDEX `FootballTrackingSlot_trackingId_status_targetMinute_idx` (`trackingId`, `status`, `targetMinute`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FootballTrackingSlot_trackingId_fkey`
    FOREIGN KEY (`trackingId`) REFERENCES `FootballLiveTracking` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FootballOddsSnapshot`
  ADD COLUMN `trackingId` VARCHAR(191) NULL,
  ADD COLUMN `slotKey` VARCHAR(32) NULL,
  ADD COLUMN `targetMinute` INTEGER NULL,
  ADD COLUMN `actualMinute` INTEGER NULL,
  ADD COLUMN `period` VARCHAR(16) NULL,
  ADD COLUMN `homeScore` INTEGER NULL,
  ADD COLUMN `awayScore` INTEGER NULL,
  ADD COLUMN `fixtureStatus` VARCHAR(16) NULL,
  ADD COLUMN `dataStatus` VARCHAR(24) NULL,
  ADD COLUMN `bookmakerId` INTEGER NULL,
  ADD COLUMN `bookmakerName` VARCHAR(191) NULL,
  ADD COLUMN `ahHtLine` DECIMAL(10, 4) NULL,
  ADD COLUMN `ahHtHomePrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `ahHtAwayPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `ahFtLine` DECIMAL(10, 4) NULL,
  ADD COLUMN `ahFtHomePrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `ahFtAwayPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `ouHtLine` DECIMAL(10, 4) NULL,
  ADD COLUMN `ouHtOverPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `ouHtUnderPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `ouFtLine` DECIMAL(10, 4) NULL,
  ADD COLUMN `ouFtOverPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `ouFtUnderPrice` DECIMAL(12, 6) NULL,
  ADD COLUMN `missingMarkets` JSON NULL,
  ADD UNIQUE INDEX `FootballOddsSnapshot_trackingId_slotKey_key` (`trackingId`, `slotKey`),
  ADD INDEX `FootballOddsSnapshot_trackingId_capturedAt_idx` (`trackingId`, `capturedAt`),
  ADD CONSTRAINT `FootballOddsSnapshot_trackingId_fkey`
    FOREIGN KEY (`trackingId`) REFERENCES `FootballLiveTracking` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FootballApiRequestLog`
  ADD COLUMN `dailyQuotaLimit` INTEGER NULL,
  ADD COLUMN `minuteQuotaLimit` INTEGER NULL,
  ADD COLUMN `minuteQuotaRemaining` INTEGER NULL;

ALTER TABLE `FootballQuotaDay`
  ADD COLUMN `providerDailyLimit` INTEGER NULL,
  ADD COLUMN `providerMinuteLimit` INTEGER NULL,
  ADD COLUMN `providerMinuteRemaining` INTEGER NULL,
  ADD COLUMN `providerMinuteWindowStart` DATETIME(3) NULL,
  ADD COLUMN `providerMinuteReserved` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `providerReportedAt` DATETIME(3) NULL;

CREATE TABLE `FootballCollectorSettings` (
  `id` VARCHAR(32) NOT NULL DEFAULT 'default',
  `isEnabled` BOOLEAN NOT NULL DEFAULT true,
  `oddsIntervalMinutes` INTEGER NOT NULL DEFAULT 5,
  `fixtureSyncIntervalHours` INTEGER NOT NULL DEFAULT 6,
  `statusCheckIntervalSeconds` INTEGER NOT NULL DEFAULT 60,
  `preferredBookmakerId` INTEGER NULL,
  `heartbeatAt` DATETIME(3) NULL,
  `workerId` VARCHAR(191) NULL,
  `lastError` TEXT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FootballCollectorLog` (
  `id` VARCHAR(191) NOT NULL,
  `trackingId` VARCHAR(191) NULL,
  `level` VARCHAR(16) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `message` VARCHAR(1000) NOT NULL,
  `details` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `FootballCollectorLog_createdAt_idx` (`createdAt`),
  INDEX `FootballCollectorLog_level_createdAt_idx` (`level`, `createdAt`),
  INDEX `FootballCollectorLog_trackingId_createdAt_idx` (`trackingId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FootballCollectorLog_trackingId_fkey`
    FOREIGN KEY (`trackingId`) REFERENCES `FootballLiveTracking` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `FootballCollectorSettings` (`id`, `isEnabled`, `updatedAt`) VALUES ('default', true, CURRENT_TIMESTAMP(3));

