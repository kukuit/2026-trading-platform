-- CreateEnum
CREATE TYPE "TodoCategory" AS ENUM ('Ainka', 'Kuku', 'Freelancer', 'Personal', 'Learning', 'Other');

-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('low', 'normal', 'high', 'urgent', 'critical');

-- CreateEnum
CREATE TYPE "TodoState" AS ENUM ('todo', 'in_progress', 'waiting', 'blocked', 'done', 'canceled', 'archived');

-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "labels" TEXT[],
    "category" "TodoCategory" NOT NULL DEFAULT 'Other',
    "priority" "TodoPriority" NOT NULL DEFAULT 'normal',
    "state" "TodoState" NOT NULL DEFAULT 'todo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "estimateMin" INTEGER,
    "spentMin" INTEGER,
    "waitingOn" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'active',

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Todo_state_priority_dueAt_idx" ON "Todo"("state", "priority", "dueAt");

-- CreateIndex
CREATE INDEX "Todo_category_idx" ON "Todo"("category");

-- CreateIndex
CREATE INDEX "Todo_parentId_sortOrder_idx" ON "Todo"("parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "Todo_status_idx" ON "Todo"("status");

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Todo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
