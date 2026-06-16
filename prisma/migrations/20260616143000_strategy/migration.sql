-- CreateTable
CREATE TABLE `Strategy` (
    `id` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `maxCoinCount` INTEGER NOT NULL,
    `coinSelectionRule` ENUM('TOP_MARKET_CAP_100', 'TOP_MARKET_CAP_50', 'HIGHEST_VOLUME', 'HIGHEST_24H_GROWTH', 'HIGHEST_7D_GROWTH') NOT NULL,
    `buyRule` ENUM('HIGHEST_24H_GROWTH', 'HIGHEST_7D_GROWTH', 'HIGHEST_VOLUME') NOT NULL,
    `sellRule` ENUM('REBALANCE_DAILY', 'REBALANCE_WEEKLY', 'TAKE_PROFIT', 'STOP_LOSS') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed a baseline strategy so existing users can be migrated into the required relation.
INSERT INTO `Strategy` (
    `id`,
    `note`,
    `maxCoinCount`,
    `coinSelectionRule`,
    `buyRule`,
    `sellRule`,
    `createdAt`,
    `updatedAt`
) VALUES (
    'default-strategy',
    'Default strategy for existing paper trading users.',
    10,
    'TOP_MARKET_CAP_100',
    'HIGHEST_24H_GROWTH',
    'REBALANCE_DAILY',
    CURRENT_TIMESTAMP(3),
    CURRENT_TIMESTAMP(3)
);

-- AlterTable
ALTER TABLE `User` ADD COLUMN `strategyId` VARCHAR(191) NULL;

-- Backfill existing users before making strategyId required.
UPDATE `User` SET `strategyId` = 'default-strategy' WHERE `strategyId` IS NULL;

-- CreateIndex
CREATE INDEX `User_strategyId_idx` ON `User`(`strategyId`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_strategyId_fkey` FOREIGN KEY (`strategyId`) REFERENCES `Strategy`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
