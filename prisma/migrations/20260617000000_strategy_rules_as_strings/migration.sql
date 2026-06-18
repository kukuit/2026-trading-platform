-- AlterTable
ALTER TABLE `Strategy`
    MODIFY `coinSelectionRule` VARCHAR(191) NOT NULL,
    MODIFY `buyRule` VARCHAR(191) NOT NULL,
    MODIFY `sellRule` VARCHAR(191) NOT NULL;
