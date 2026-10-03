export function mergeCartItems<T extends { variantId: string; quantity: number }>(current: T[], incoming: T[]): T[] | null {
  const merged = current.map(item => ({ ...item }));
  for (const item of incoming) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) return null;
    const found = merged.find(line => line.variantId === item.variantId);
    if (found) found.quantity += item.quantity;
    else merged.push({ ...item });
  }
  return merged.length > 20 || merged.some(item => item.quantity > 20) ? null : merged;
}
