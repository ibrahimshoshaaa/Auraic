import { z } from "zod";

export const couponCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,40}$/, "اكتب كودًا من 2 إلى 40 حرفًا إنجليزيًا أو رقمًا");
export const couponSchema = z.object({
  code: couponCode, type: z.enum(["percent", "fixed"]),
  value: z.number().finite().min(0).max(1000000),
  minOrder: z.number().finite().min(0).max(1000000).default(0),
  minItems: z.number().int().min(0).max(400).default(0),
  maxDiscount: z.number().finite().positive().max(1000000).nullable().default(null),
  maxUses: z.number().int().min(0).max(1000000).default(0),
  startsAt: z.iso.datetime().nullable().default(null), expiresAt: z.iso.datetime().nullable().default(null),
  productId: z.string().min(1).max(100).nullable().default(null),
  scope: z.enum(["ALL", "FRAGRANCES", "SAMPLES", "MEN", "WOMEN", "UNISEX"]).default("ALL"),
  freeShipping: z.boolean().default(false), active: z.boolean().default(true),
}).superRefine((v, ctx) => {
  if (v.type === "percent" && v.value > 100) ctx.addIssue({ code: "custom", message: "النسبة لا تتجاوز 100٪", path: ["value"] });
  if (!v.value && !v.freeShipping) ctx.addIssue({ code: "custom", message: "حدد خصمًا أو شحنًا مجانيًا", path: ["value"] });
  if (v.startsAt && v.expiresAt && Date.parse(v.startsAt) >= Date.parse(v.expiresAt)) ctx.addIssue({ code: "custom", message: "تاريخ الانتهاء يجب أن يكون بعد البداية", path: ["expiresAt"] });
});
export type CouponInput = z.infer<typeof couponSchema>;
export type CouponRule = Omit<CouponInput, "startsAt" | "expiresAt"> & { startsAt: Date | null; expiresAt: Date | null; usedCount: number };
export type CouponLine = { priceCents: number; quantity: number; productId: string; sample: boolean; audience: string };
export class CouponError extends Error {}
export function couponDiscount(rule: CouponRule, lines: CouponLine[], now = new Date()) {
  if (!rule.active || (rule.startsAt && rule.startsAt > now) || (rule.expiresAt && rule.expiresAt <= now) || (rule.maxUses > 0 && rule.usedCount >= rule.maxUses)) throw new CouponError("This coupon is inactive, expired or fully used.");
  const subtotal = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  if (subtotal < Math.round(rule.minOrder * 100)) throw new CouponError(`Minimum order for this coupon: ${rule.minOrder} LE.`);
  const eligible = lines.map(l => (!rule.productId || l.productId === rule.productId) && (
    rule.scope === "ALL" || rule.scope === "SAMPLES" && l.sample || rule.scope === "FRAGRANCES" && !l.sample ||
    ["MEN", "WOMEN", "UNISEX"].includes(rule.scope) && (l.audience === rule.scope.toLowerCase() || rule.scope !== "UNISEX" && l.audience === "unisex")));
  const quantity = lines.reduce((n, l, i) => n + (eligible[i] ? l.quantity : 0), 0);
  if (!quantity || quantity < rule.minItems) throw new CouponError("This coupon does not apply to these items or their quantity.");
  const bases = lines.map((l, i) => eligible[i] ? l.priceCents * l.quantity : 0);
  const eligibleTotal = bases.reduce((a, b) => a + b, 0);
  let discountCents = rule.type === "percent" ? Math.round(eligibleTotal * rule.value / 100) : Math.round(rule.value * 100);
  discountCents = Math.min(eligibleTotal, discountCents, rule.maxDiscount === null ? eligibleTotal : Math.round(rule.maxDiscount * 100));
  // Largest remainders keep per-item reporting equal to the exact order discount.
  const amounts = bases.map(base => discountCents * base / eligibleTotal);
  const lineDiscounts = amounts.map(Math.floor);
  let left = discountCents - lineDiscounts.reduce((a, b) => a + b, 0);
  for (const i of amounts.map((a, i) => ({ i, remainder: a - lineDiscounts[i] })).sort((a, b) => b.remainder - a.remainder).map(v => v.i)) { if (!left) break; lineDiscounts[i]++; left--; }
  return { discountCents, lineDiscounts, freeShipping: rule.freeShipping };
}
