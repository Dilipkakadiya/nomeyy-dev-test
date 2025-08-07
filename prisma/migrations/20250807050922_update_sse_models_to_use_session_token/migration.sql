/*
  Warnings:

  - You are about to drop the column `userId` on the `SSEEvent` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `SSESession` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `SSESubscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sessionToken,eventName,clientId]` on the table `SSESubscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sessionToken` to the `SSESubscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SSESubscription_userId_eventName_clientId_key";

-- AlterTable
ALTER TABLE "SSEEvent" DROP COLUMN "userId",
ADD COLUMN     "sessionToken" TEXT;

-- AlterTable
ALTER TABLE "SSESession" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "SSESubscription" DROP COLUMN "userId",
ADD COLUMN     "sessionToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SSESubscription_sessionToken_eventName_clientId_key" ON "SSESubscription"("sessionToken", "eventName", "clientId");
