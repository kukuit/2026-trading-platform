-- AlterTable
ALTER TABLE `Strategy`
    MODIFY `maxCoinCount` INTEGER NULL,
    MODIFY `coinSelectionRule` VARCHAR(191) NULL,
    MODIFY `buyRule` VARCHAR(191) NULL,
    MODIFY `sellRule` VARCHAR(191) NULL;
