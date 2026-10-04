import { Prisma } from "@prisma/client";
import type { ShopSettings } from "@/lib/storefront/config";
import { shippingFeeFor } from "@/lib/storefront/config";
import { checkoutTotals } from "@/lib/storefront/pricing";
import { couponDiscount, CouponError, type CouponInput } from "@/lib/storefront/coupons";
import { activeProductStatus } from "@/lib/active-product";
import { isSample, productAudience } from "@/lib/storefront/collections";
export class QuoteError extends Error {}
export async function quoteOrder(tx: Prisma.TransactionClient, storeId: string, settings: ShopSettings, items: { variantId: string; quantity: number }[], governorate: string, code = "", lock = false) {
  const ids = items.map(item => item.variantId);
  if (new Set(ids).size !== ids.length) throw new QuoteError("Duplicate item in your bag.");
  const variants = await tx.productVariant.findMany({ where: { storeId, id: { in: ids }, active: true, price: { gt: 0 },
    product: { storefrontPublished: true, ...activeProductStatus },
    recipes: { some: { active: true, versions: { some: { isCurrent: true, items: { some: {} } } } } } },
    include: { product: { select: { id: true, title: true, storefrontCategory: true } } } });
  if (variants.length !== ids.length) throw new QuoteError("An item is no longer available. Review your bag.");
  const byId = new Map(variants.map(v => [v.id, v]));
  const totals = checkoutTotals(items.map(i => ({ quantity: i.quantity, price: Number(byId.get(i.variantId)!.price) })), shippingFeeFor(settings, governorate), settings.freeShippingFrom);
  if (code && lock) await tx.$queryRaw`SELECT "id" FROM "Coupon" WHERE "storeId" = ${storeId} AND "code" = ${code} FOR UPDATE`;
  const coupon = code ? await tx.coupon.findUnique({ where: { storeId_code: { storeId, code } } }) : null;
  if (code && !coupon) throw new CouponError("Coupon not found.");
  const discount = coupon ? couponDiscount({ ...coupon, type: coupon.type as "percent" | "fixed", scope: coupon.scope as CouponInput["scope"], value: Number(coupon.value), minOrder: Number(coupon.minOrder), maxDiscount: coupon.maxDiscount === null ? null : Number(coupon.maxDiscount) }, items.map(i => { const v = byId.get(i.variantId)!; return { quantity: i.quantity, priceCents: Math.round(Number(v.price) * 100), productId: v.product.id, sample: isSample(v.product.storefrontCategory), audience: productAudience(v.product.storefrontCategory) }; })) : { discountCents: 0, lineDiscounts: items.map(() => 0), freeShipping: false };
  const shippingCents = discount.freeShipping ? 0 : totals.shippingCents;
  return { byId, coupon, lineDiscounts: discount.lineDiscounts, totals: { ...totals, shippingCents, discountCents: discount.discountCents, totalCents: totals.subtotalCents - discount.discountCents + shippingCents }, freeShipping: discount.freeShipping };
}
