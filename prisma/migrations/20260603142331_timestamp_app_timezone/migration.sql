-- AlterTable
ALTER TABLE `coin` ALTER COLUMN `createdAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `coinmarketdata` ALTER COLUMN `createdAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `holding` ALTER COLUMN `createdAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `trade` ALTER COLUMN `createdAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `user` ALTER COLUMN `createdAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `userdailyasset` ALTER COLUMN `createdAt` DROP DEFAULT;
