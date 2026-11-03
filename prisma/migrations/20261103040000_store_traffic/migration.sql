CREATE TABLE "StoreVisit" (
 "id" TEXT PRIMARY KEY, "storeId" TEXT NOT NULL, "session" TEXT NOT NULL, "path" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "StoreVisit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StoreVisit_storeId_createdAt_idx" ON "StoreVisit"("storeId", "createdAt");
CREATE INDEX "StoreVisit_storeId_session_idx" ON "StoreVisit"("storeId", "session");
