export const SOCIAL_MEDIA_CATEGORY = "مصاريف سوشيال ميديا";
const money = (v: number) => Math.round(v * 100) / 100;
export function profitMetrics(revenue: number, recipeCost: number, missingLines: number, estimated: boolean) {
  const profit = missingLines ? null : money(revenue - recipeCost);
  return { revenue: money(revenue), recipeCost: money(recipeCost), profit,
    margin: profit === null || revenue <= 0 ? null : money(profit / revenue * 100),
    incomplete: missingLines > 0, missingLines, estimated };
}
export function roasMetrics(sales: number, spend: number) {
  return { sales: money(sales), spend: money(spend), ratio: spend > 0 ? Math.round(sales / spend * 10000) / 10000 : null };
}
export function recipeLineCost(parts: { quantity: number; unitCost: number | null }[], restockedUnits = 0, soldUnits = 1) {
  if (!parts.length || parts.some(p => p.unitCost === null)) return null;
  const retained = soldUnits > 0 ? Math.max(0, 1 - Math.min(restockedUnits, soldUnits) / soldUnits) : 0;
  return parts.reduce((sum,p) => sum + p.quantity * p.unitCost!, 0) * retained;
}
