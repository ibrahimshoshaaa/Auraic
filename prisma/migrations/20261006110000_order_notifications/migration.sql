ALTER TABLE "MobileSession" ADD COLUMN "pushToken" TEXT, ADD COLUMN "pushUpdatedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "MobileSession_pushToken_key" ON "MobileSession"("pushToken");
CREATE TABLE "PushDelivery" (
 "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "sessionId" TEXT NOT NULL, "token" TEXT NOT NULL,
 "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "claimedAt" TIMESTAMP(3), "finishedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PushDelivery_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PushDelivery_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MobileSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PushDelivery_orderId_sessionId_key" ON "PushDelivery"("orderId", "sessionId");
CREATE INDEX "PushDelivery_finishedAt_nextAttemptAt_idx" ON "PushDelivery"("finishedAt", "nextAttemptAt");
