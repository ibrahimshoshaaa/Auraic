-- Preserve business records and transfer imported orders to the local workflow.
UPDATE "Order" SET "manualStatus" = CASE
  WHEN "shopifyStage" IN ('PREPARED', 'SHIPPING', 'DELIVERED', 'RETURNED') THEN "shopifyStage"
  WHEN "financialStatus" = 'REFUNDED' THEN 'RETURNED'
  WHEN "fulfillmentStatus" IN ('FULFILLED', 'PARTIALLY_FULFILLED') THEN 'SHIPPING'
  WHEN EXISTS (SELECT 1 FROM "OrderItem" i WHERE i."orderId" = "Order"."id")
    AND NOT EXISTS (SELECT 1 FROM "OrderItem" i WHERE i."orderId" = "Order"."id" AND i."consumptionStatus" <> 'CONSUMED') THEN 'PREPARED'
  ELSE 'NEW'
END WHERE "manualStatus" IS NULL;

DROP TABLE "ShopifyConnection";
DROP TABLE "WebhookEvent";
DROP TABLE "SyncJob";
DROP TABLE "SyncState";
ALTER TABLE "Store" DROP COLUMN "shopifyShopDomain", DROP COLUMN "encryptedShopifyAccessToken";
ALTER TABLE "Product" DROP COLUMN "shopifyId";
ALTER TABLE "ProductVariant" DROP COLUMN "shopifyId";
ALTER TABLE "Order" DROP COLUMN "shopifyId", DROP COLUMN "shopifyStage";
ALTER TABLE "OrderItem" DROP COLUMN "shopifyLineId";
ALTER TABLE "Return" DROP COLUMN "shopifyId";
