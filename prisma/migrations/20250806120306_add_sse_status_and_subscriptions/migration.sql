-- CreateTable
CREATE TABLE "SSEClientStatus" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SSEClientStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SSESubscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SSESubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SSEClientStatus_clientId_key" ON "SSEClientStatus"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "SSESubscription_clientId_eventType_key" ON "SSESubscription"("clientId", "eventType");

-- AddForeignKey
ALTER TABLE "SSESubscription" ADD CONSTRAINT "SSESubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "SSEClientStatus"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
