ALTER TABLE "ProductVariant" ADD COLUMN "compareAtPrice" DECIMAL(18,4);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_compare_price" CHECK ("compareAtPrice" IS NULL OR "compareAtPrice" > "price");
