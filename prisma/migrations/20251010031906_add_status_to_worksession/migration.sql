-- CreateEnum
CREATE TYPE "WorkSessionStatus" AS ENUM ('active', 'disabled');

-- AlterTable
ALTER TABLE "WorkSession" ADD COLUMN     "status" "WorkSessionStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "WorkSession_status_idx" ON "WorkSession"("status");
