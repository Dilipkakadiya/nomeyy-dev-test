/*
  Warnings:

  - You are about to drop the column `eventType` on the `SSESubscription` table. All the data in the column will be lost.
  - You are about to drop the `SSEClientStatus` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,eventName,clientId]` on the table `SSESubscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `eventName` to the `SSESubscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SSESubscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SSESubscription" DROP CONSTRAINT "SSESubscription_clientId_fkey";

-- DropIndex
DROP INDEX "SSESubscription_clientId_eventType_key";

-- AlterTable
ALTER TABLE "SSESubscription" DROP COLUMN "eventType",
ADD COLUMN     "eventName" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "clientId" DROP NOT NULL;

-- DropTable
DROP TABLE "SSEClientStatus";

-- CreateTable
CREATE TABLE "SSESession" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionToken" TEXT,
    "username" TEXT,
    "status" TEXT NOT NULL DEFAULT 'online',
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPing" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SSESession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SSESession_clientId_key" ON "SSESession"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SSESubscription_userId_eventName_clientId_key" ON "SSESubscription"("userId", "eventName", "clientId");
