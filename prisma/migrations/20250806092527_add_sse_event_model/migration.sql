-- CreateTable
CREATE TABLE "SSEEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SSEEvent_pkey" PRIMARY KEY ("id")
);
