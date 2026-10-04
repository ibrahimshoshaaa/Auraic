ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
CREATE TABLE "Coupon" (
 "id" TEXT NOT NULL, "storeId" TEXT NOT NULL, "code" TEXT NOT NULL, "type" TEXT NOT NULL,
 "value" DECIMAL(18,4) NOT NULL, "minOrder" DECIMAL(18,4) NOT NULL DEFAULT 0,
 "minItems" INTEGER NOT NULL DEFAULT 0, "maxDiscount" DECIMAL(18,4),
 "maxUses" INTEGER NOT NULL DEFAULT 0, "usedCount" INTEGER NOT NULL DEFAULT 0,
 "startsAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "productId" TEXT,
 "scope" TEXT NOT NULL DEFAULT 'ALL', "freeShipping" BOOLEAN NOT NULL DEFAULT false,
 "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Coupon_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Coupon_storeId_code_key" ON "Coupon"("storeId", "code");
CREATE INDEX "Coupon_storeId_createdAt_idx" ON "Coupon"("storeId", "createdAt");
