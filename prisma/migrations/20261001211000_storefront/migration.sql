ALTER TABLE "Product"
ADD COLUMN "storefrontPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "storefrontDescription" TEXT NOT NULL DEFAULT '',
ADD COLUMN "storefrontCategory" TEXT NOT NULL DEFAULT 'العطور',
ADD COLUMN "storefrontImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "storefrontFeatured" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "StorefrontRateLimit" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "StorefrontRateLimit_expiresAt_idx" ON "StorefrontRateLimit"("expiresAt");
