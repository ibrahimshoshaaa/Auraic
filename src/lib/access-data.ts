import { can, type AccessPrincipal } from "./rbac";
import type { BusinessReport } from "./reports/export-data";

export function reportAccess(actor: AccessPrincipal) {
  return {
    costs: can(actor, "costs.read"), profits: can(actor, "profits.read"),
    expenses: can(actor, "expenses.read"), consumption: can(actor, "consumption.read"),
    inventory: can(actor, "inventory.read"), export: can(actor, "reports.export"),
  };
}
export function reportForAccess(r: BusinessReport, actor: AccessPrincipal) {
  const a = reportAccess(actor);
  return {
    range: r.range, currency: r.currency,
    notes: { excludedDifferentCurrencyOrders: r.notes.excludedDifferentCurrencyOrders },
    sales: r.sales, cash: r.cash, salesByDay: r.salesByDay,
    returns: { ...r.returns, costs: a.costs ? r.returns.costs : undefined },
    returnsByDay: r.returnsByDay, returnedProducts: r.returnedProducts,
    products: r.products.map(p => ({ ...p, estimatedCost: a.costs ? p.estimatedCost : undefined })),
    expenses: a.expenses ? r.expenses : undefined,
    consumption: a.consumption ? r.consumption : undefined,
    inventory: a.inventory ? r.inventory.map(m => ({ id: m.id, name: m.name, type: m.type, unit: m.unit, stock: m.stock, reorderLevel: m.reorderLevel,
      ...(a.consumption ? { purchased: m.purchased, consumed: m.consumed, wasted: m.wasted, returned: m.returned, adjusted: m.adjusted } : {}),
      ...(a.costs ? { estimatedValue: m.estimatedValue } : {}) })) : undefined,
    lowStock: a.inventory ? r.lowStock : undefined,
    profit: a.profits ? r.profit : undefined,
    profitability: a.profits ? r.profitability : undefined,
    roas: a.expenses ? r.roas : undefined,
    access: a,
  };
}
/** Product reads have explicit, separate boundaries for formulas and financial data. */
export function productForAccess<T extends { variants: V[] }, V extends { recipes?: unknown; currentRecipe?: unknown; costing?: { estimatedCost: number; estimatedMargin: number; complete: boolean } | null }>(product: T, actor: AccessPrincipal) {
  return { ...product, variants: product.variants.map(variant => ({ ...variant,
    recipes: can(actor, "recipes.read") ? cleanRecipeMaterials(variant.recipes, actor) : undefined,
    currentRecipe: can(actor, "recipes.read") ? variant.currentRecipe : undefined,
    costing: !can(actor, "costs.read") ? undefined : variant.costing ? { estimatedCost: variant.costing.estimatedCost, complete: variant.costing.complete, ...(can(actor, "profits.read") ? { estimatedMargin: variant.costing.estimatedMargin } : {}) } : variant.costing,
  })) };
}

export function materialForAccess<T extends { defaultCost: unknown; metadata?: unknown }>(material: T, actor: AccessPrincipal) {
  return { ...material, defaultCost: can(actor, "costs.read") ? material.defaultCost : undefined, metadata: can(actor, "costs.read") ? material.metadata : undefined };
}
export function recipeForAccess<T extends { versions: { items: { material: { defaultCost: unknown; metadata?: unknown } }[] }[] }>(recipe: T, actor: AccessPrincipal) {
  return { ...recipe, versions: recipe.versions.map(version => ({ ...version, items: version.items.map(item => ({ ...item, material: materialForAccess(item.material, actor) })) })) };
}

function cleanRecipeMaterials(value: unknown, actor: AccessPrincipal): unknown {
  if (can(actor, "costs.read")) return value;
  if (Array.isArray(value)) return value.map(v => cleanRecipeMaterials(v, actor));
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "defaultCost" && key !== "metadata").map(([key, v]) => [key, cleanRecipeMaterials(v, actor)]));
  return value;
}
