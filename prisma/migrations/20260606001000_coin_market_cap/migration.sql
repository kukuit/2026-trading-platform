-- AlterTable
ALTER TABLE `coin`
    ADD COLUMN `marketCap` DECIMAL(24, 2) NOT NULL DEFAULT 0;
