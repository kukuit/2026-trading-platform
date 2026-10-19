CREATE TABLE `FootballFixture` (
  `id` VARCHAR(191) NOT NULL,
  `providerFixtureId` INTEGER NOT NULL,
  `providerLeagueId` INTEGER NOT NULL,
  `season` INTEGER NOT NULL,
  `homeTeamId` INTEGER NULL,
  `awayTeamId` INTEGER NULL,
  `homeTeamName` VARCHAR(191) NOT NULL,
  `awayTeamName` VARCHAR(191) NOT NULL,
  `homeTeamLogo` VARCHAR(512) NULL,
  `awayTeamLogo` VARCHAR(512) NULL,
  `kickoffAt` DATETIME(3) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'NS',
  `elapsedMinute` INTEGER NULL,
  `homeScore` INTEGER NULL,
  `awayScore` INTEGER NULL,
  `isTestFixture` BOOLEAN NOT NULL DEFAULT false,
  `lastSyncedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `FootballFixture_providerFixtureId_key` (`providerFixtureId`),
  INDEX `FootballFixture_providerLeagueId_kickoffAt_idx` (`providerLeagueId`, `kickoffAt`),
  INDEX `FootballFixture_status_kickoffAt_idx` (`status`, `kickoffAt`),
  INDEX `FootballFixture_isTestFixture_kickoffAt_idx` (`isTestFixture`, `kickoffAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FootballOddsSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `fixtureId` VARCHAR(191) NOT NULL,
  `capturedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `providerUpdatedAt` DATETIME(3) NULL,
  `sourceHash` CHAR(64) NOT NULL,
  `sourceType` ENUM('LIVE') NOT NULL DEFAULT 'LIVE',
  `isTest` BOOLEAN NOT NULL DEFAULT false,
  `rawJson` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `FootballOddsSnapshot_fixtureId_capturedAt_idx` (`fixtureId`, `capturedAt`),
  INDEX `FootballOddsSnapshot_isTest_capturedAt_idx` (`isTest`, `capturedAt`),
  INDEX `FootballOddsSnapshot_sourceHash_idx` (`sourceHash`),
  INDEX `FootballOddsSnapshot_capturedAt_idx` (`capturedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FootballOddsSnapshot_fixtureId_fkey`
    FOREIGN KEY (`fixtureId`) REFERENCES `FootballFixture` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FootballOddsValue` (
  `id` VARCHAR(191) NOT NULL,
  `snapshotId` VARCHAR(191) NOT NULL,
  `providerBetId` INTEGER NOT NULL,
  `betName` VARCHAR(191) NOT NULL,
  `bookmakerId` INTEGER NULL,
  `bookmakerName` VARCHAR(191) NULL,
  `selectionName` VARCHAR(191) NOT NULL,
  `oddValue` VARCHAR(64) NOT NULL,
  `oddNumeric` DECIMAL(12, 6) NULL,
  `main` BOOLEAN NULL,
  `suspended` BOOLEAN NULL,
  `blocked` BOOLEAN NULL,
  `stopped` BOOLEAN NULL,
  `finished` BOOLEAN NULL,
  `extraData` JSON NULL,
  INDEX `FootballOddsValue_snapshotId_idx` (`snapshotId`),
  INDEX `FootballOddsValue_providerBetId_selectionName_idx` (`providerBetId`, `selectionName`),
  PRIMARY KEY (`id`),
  CONSTRAINT `FootballOddsValue_snapshotId_fkey`
    FOREIGN KEY (`snapshotId`) REFERENCES `FootballOddsSnapshot` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FootballCollectorJob` (
  `id` VARCHAR(191) NOT NULL,
  `jobName` VARCHAR(64) NOT NULL,
  `mode` ENUM('PRODUCTION', 'TEST') NOT NULL DEFAULT 'PRODUCTION',
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `leagueId` INTEGER NOT NULL DEFAULT 39,
  `season` INTEGER NOT NULL,
  `fixtureId` INTEGER NULL,
  `pollingIntervalSeconds` INTEGER NOT NULL DEFAULT 300,
  `dailyTotalLimit` INTEGER NOT NULL DEFAULT 100,
  `dailyOddsBudget` INTEGER NOT NULL DEFAULT 80,
  `dailyReservedBudget` INTEGER NOT NULL DEFAULT 20,
  `lastRunAt` DATETIME(3) NULL,
  `nextRunAt` DATETIME(3) NULL,
  `lastSuccessAt` DATETIME(3) NULL,
  `lastFixtureSyncAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'IDLE',
  `lockOwner` VARCHAR(191) NULL,
  `lockExpiresAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `FootballCollectorJob_jobName_key` (`jobName`),
  INDEX `FootballCollectorJob_enabled_status_nextRunAt_idx` (`enabled`, `status`, `nextRunAt`),
  INDEX `FootballCollectorJob_lockExpiresAt_idx` (`lockExpiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FootballApiRequestLog` (
  `id` VARCHAR(191) NOT NULL,
  `endpoint` VARCHAR(191) NOT NULL,
  `requestType` VARCHAR(16) NOT NULL,
  `fixtureId` INTEGER NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `statusCode` INTEGER NULL,
  `success` BOOLEAN NOT NULL DEFAULT false,
  `durationMs` INTEGER NOT NULL,
  `dailyQuotaRemaining` INTEGER NULL,
  `errorMessage` TEXT NULL,
  INDEX `FootballApiRequestLog_requestedAt_idx` (`requestedAt`),
  INDEX `FootballApiRequestLog_fixtureId_requestedAt_idx` (`fixtureId`, `requestedAt`),
  INDEX `FootballApiRequestLog_success_requestedAt_idx` (`success`, `requestedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FootballQuotaDay` (
  `utcDate` DATE NOT NULL,
  `totalUsed` INTEGER NOT NULL DEFAULT 0,
  `oddsUsed` INTEGER NOT NULL DEFAULT 0,
  `reservedUsed` INTEGER NOT NULL DEFAULT 0,
  `providerRemaining` INTEGER NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`utcDate`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
