-- CreateEnum
CREATE TYPE "Status" AS ENUM ('active', 'disabled');

-- CreateTable
CREATE TABLE "HealthLog" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "weekday" TEXT,
    "weight" DECIMAL(5,2),
    "morning" TEXT,
    "gym" TEXT,
    "afternoon" TEXT,
    "noEatAfter" TEXT,
    "calories" INTEGER,
    "goutTreatment" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthLog_date_idx" ON "HealthLog"("date");

-- CreateIndex
CREATE INDEX "HealthLog_status_idx" ON "HealthLog"("status");
