export function checkoutTotals(lines: { price: number; quantity: number }[], fee: number, freeFrom: number) {
  const subtotalCents = lines.reduce((sum, line) => sum + Math.round(line.price * 100) * line.quantity, 0);
  const shippingCents = freeFrom > 0 && subtotalCents >= Math.round(freeFrom * 100) ? 0 : Math.round(fee * 100);
  return { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}
export const formatMoney = (value: number) => `${new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(value)} LE`;
