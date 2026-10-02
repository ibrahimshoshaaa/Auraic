export type Audience = "men" | "women" | "unisex";
export function productAudience(category: string): Audience {
  const value = category.trim().toLowerCase();
  if (["men", "male", "رجالي", "رجال", "عطور رجالي"].includes(value)) return "men";
  if (["women", "female", "حريمي", "نسائي", "نساء", "عطور حريمي"].includes(value)) return "women";
  return "unisex";
}
export function matchesAudience(category: string, audience: string) {
  const target = productAudience(category);
  return target === audience || target === "unisex" && (audience === "men" || audience === "women");
}
export function hasOffer(product: { variants: { price: number; compareAtPrice: number | null }[] }) {
  return product.variants.some(v => v.compareAtPrice !== null && v.compareAtPrice > v.price);
}
