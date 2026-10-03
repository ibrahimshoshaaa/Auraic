export type RecipeLine = { materialId: string; quantity: number | string };
export function toggleRecipeMaterial(lines: RecipeLine[], id: string): RecipeLine[] {
  const clean = lines.filter(line => line.materialId);
  if (clean.some(line => line.materialId === id)) return clean.filter(line => line.materialId !== id);
  return clean.length >= 30 ? clean : [...clean, { materialId: id, quantity: 1 }];
}
export function adjustRecipeQuantity(value: number | string, delta: number) {
  const quantity = Number(value);
  return Math.min(10000000, Math.max(0.000001, Math.round(((Number.isFinite(quantity) ? quantity : 1) + delta) * 1000000) / 1000000));
}
