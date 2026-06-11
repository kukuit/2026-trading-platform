-- AlterTable
ALTER TABLE `coin`
    ADD COLUMN `binancePair` VARCHAR(191) NULL,
    ADD COLUMN `coingeckoId` VARCHAR(191) NULL,
    ALTER COLUMN `createdAt` SET DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX `Coin_binancePair_key` ON `coin`(`binancePair`);

-- CreateIndex
CREATE UNIQUE INDEX `Coin_coingeckoId_key` ON `coin`(`coingeckoId`);
