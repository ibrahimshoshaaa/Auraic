import { db } from "@/lib/db";
import { isCostingEnabled } from "@/lib/settings";
import { profitMetrics, roasMetrics, recipeLineCost, SOCIAL_MEDIA_CATEGORY } from "./profit.math";
import { Prisma } from "@prisma/client";

import { getReportRange, localDate } from "./report-range";
const n = (value: Prisma.Decimal | number | null | undefined) => Number(value ?? 0);
const money = (value: number) => Math.round(value * 100) / 100;

export async function getBusinessReport(storeId: string, options: { period?: string; from?: string; to?: string } = {}) {
  const store = await db.store.findUniqueOrThrow({ where: { id: storeId } });
  const range = getReportRange(store.timezone, options.period, options.from, options.to);
  const between = { gte: range.start, lt: range.endExclusive };
  const [orders, returns, expenses, consumptions, balances, transactions, costingEnabled, unmatchedCurrencyOrders, orderConsumptions, manualPayments] = await Promise.all([
    db.order.findMany({ where: { storeId, currency: store.currency, occurredAt: between, OR: [{ manualStatus: null }, { manualStatus: "DELIVERED" }] }, include: { items: { include: { variant: { include: { product: true } }, returnItems: { where: { return: { processedAt: { not: null } } } } } } }, orderBy: { occurredAt: "asc" } }),
    db.return.findMany({ where: { storeId, createdAt: between, order: { currency: store.currency } }, include: { items: { include: { orderItem: { include: { variant: { include: { product: true } } } } } } } }),
    db.expense.findMany({ where: { storeId, currency: store.currency, date: between }, include: { category: true }, orderBy: { date: "desc" } }),
    db.consumption.findMany({ where: { storeId, createdAt: between }, include: { items: { include: { material: true } }, recipeVersion: { include: { items: { include: { material: true } } } } } }),
    db.inventoryBalance.findMany({ where: { storeId }, include: { material: { include: { materialType: true } } } }),
    db.inventoryTransaction.findMany({ where: { storeId, createdAt: between }, include: { material: true } }),
    isCostingEnabled(storeId),
    db.order.count({ where: { storeId, currency: { not: store.currency }, occurredAt: between, OR: [{ manualStatus: null }, { manualStatus: "DELIVERED" }] } }),
    db.consumption.findMany({ where: { storeId, order: { currency: store.currency, occurredAt: between, OR: [{ manualStatus: null }, { manualStatus: "DELIVERED" }] } }, include: { items: { include: { material: true } }, recipeVersion: { include: { items: { include: { material: true } } } } } }),
    db.order.findMany({ where: { storeId, currency: store.currency, manualStatus: { not: null }, OR: [{ occurredAt: between }, { manualStatus: "DELIVERED", updatedAt: between }] }, select: { occurredAt: true, updatedAt: true, manualStatus: true, depositAmount: true, total: true } }),
  ]);

  // Deposits are cash received when the order is placed, even before delivery.
  // The remaining balance is received on delivery; neither event changes sales recognition.
  const cash = { deposits: 0, deliveryBalances: 0, received: 0 };
  for (const order of manualPayments) {
    const deposit = n(order.depositAmount);
    if (order.occurredAt >= range.start && order.occurredAt < range.endExclusive) cash.deposits += deposit;
    if (order.manualStatus === "DELIVERED" && order.updatedAt >= range.start && order.updatedAt < range.endExclusive) {
      cash.deliveryBalances += Math.max(0, n(order.total) - deposit);
    }
  }
  cash.received = cash.deposits + cash.deliveryBalances;

  const sales = { total: 0, gross: 0, discounts: 0, refunded: 0, net: 0, units: 0, orders: orders.length, averageOrderValue: 0 };
  const salesByDay = new Map<string, { date: string; gross: number; net: number; orders: number }>();
  const products = new Map<string, { key: string; product: string; variant: string; units: number; gross: number; discounts: number; refunds: number; net: number; returnedUnits: number; estimatedCost: number }>();
  for (const order of orders) {
    const gross = n(order.total) + n(order.discount); const net = n(order.netSales); const date = localDate(order.occurredAt, store.timezone);
    sales.total += n(order.total); sales.gross += gross; sales.discounts += n(order.discount); sales.refunded += n(order.refunded); sales.net += net;
    const daily = salesByDay.get(date) ?? { date, gross: 0, net: 0, orders: 0 };
    daily.gross += gross; daily.net += net; daily.orders++; salesByDay.set(date, daily);
    for (const item of order.items) {
      const key = item.variantId ?? `line:${item.title}:${item.sku ?? ""}`;
      const row = products.get(key) ?? { key, product: item.variant?.product.title ?? item.title, variant: item.variant?.title ?? item.sku ?? "—", units: 0, gross: 0, discounts: 0, refunds: 0, net: 0, returnedUnits: 0, estimatedCost: 0 };
      const itemGross = n(item.originalPrice) * n(item.quantity);
      row.units += n(item.quantity); row.gross += itemGross; row.discounts += n(item.discount); row.refunds += n(item.refunded);
      row.net = row.gross - row.discounts - row.refunds;
      products.set(key, row); sales.units += n(item.quantity);
    }
  }
  sales.averageOrderValue = sales.orders ? sales.net / sales.orders : 0;
  const returnTotals = { count: returns.length, units: 0, value: 0, costs: 0, restocked: 0, notRestocked: 0 };
  const returnsByDay = new Map<string, { date: string; count: number; value: number }>();
  const returnedProducts = new Map<string, { product: string; variant: string; units: number }>();
  for (const ret of returns) {
    returnTotals.value += n(ret.totalAmount); returnTotals.costs += n(ret.returnCost);
    const date = localDate(ret.createdAt, store.timezone);
    const daily = returnsByDay.get(date) ?? { date, count: 0, value: 0 }; daily.count++; daily.value += n(ret.totalAmount); returnsByDay.set(date, daily);
    for (const item of ret.items) {
      returnTotals.units += n(item.quantity);
      if (item.restocked) returnTotals.restocked += n(item.quantity); else returnTotals.notRestocked += n(item.quantity);
      const key = item.orderItem.variantId ?? `line:${item.orderItem.title}:${item.orderItem.sku ?? ""}`;
      const prior = returnedProducts.get(key) ?? { product: item.orderItem.variant?.product.title ?? item.orderItem.title, variant: item.orderItem.variant?.title ?? item.orderItem.sku ?? "—", units: 0 };
      prior.units += n(item.quantity); returnedProducts.set(key, prior);
      const product = products.get(key); if (product) product.returnedUnits += n(item.quantity);
    }
  }
  const expenseCategories = new Map<string, { category: string; amount: number }>();
  let expenseTotal = 0; let returnExpenses = 0; let purchaseExpenses = 0; let socialMediaSpend = 0;
  for (const expense of expenses) {
    const amount = n(expense.amount); expenseTotal += amount;
    if (expense.category.name === SOCIAL_MEDIA_CATEGORY) socialMediaSpend += amount;
    if (expense.returnId) returnExpenses += amount;
    if (expense.purchaseId) purchaseExpenses += amount;
    const prior = expenseCategories.get(expense.categoryId) ?? { category: expense.category.name, amount: 0 };
    prior.amount += amount; expenseCategories.set(expense.categoryId, prior);
  }
  const materials = new Map<string, { id: string; name: string; unit: string; consumed: number; orders: Set<string>; products: Set<string> }>();
  let estimatedProductCost = 0; let missingCosts = 0; let costsEstimated = false; let productRevenue = 0;
  // Cost snapshots live in the existing immutable consumption audit entry, so
  // existing deployments do not require a schema migration to calculate profit.
  const snapshots = await db.auditLog.findMany({ where: { storeId, entity: "Consumption", action: "CREATE", entityId: { in: orderConsumptions.map(c => c.id) } }, select: { entityId: true, after: true } });
  const costsByConsumption = new Map(snapshots.map(snapshot => {
    const after = snapshot.after as Prisma.JsonObject | null;
    const parts = Array.isArray(after?.materials) ? after.materials as Prisma.JsonObject[] : [];
    return [snapshot.entityId, new Map(parts.map(part => [String(part.materialId), part.unitCost == null ? null : Number(part.unitCost)]))] as const;
  }));
  const consumptionByItem = new Map(orderConsumptions.map(c => [c.orderItemId, c]));
  for (const order of orders) for (const item of order.items) {
    productRevenue += n(item.finalLinePrice ?? n(item.originalPrice) * n(item.quantity) - n(item.discount)) - n(item.refunded);
    const consumption = consumptionByItem.get(item.id);
    if (!consumption) { missingCosts++; continue; }
    const restockedUnits = item.returnItems.filter(r => r.restocked).reduce((sum,r) => sum + n(r.quantity), 0);
    const parts = consumption.items.map(part => {
      const snapshotCost = costsByConsumption.get(consumption.id)?.get(part.materialId);
      if (snapshotCost === undefined || snapshotCost === null) costsEstimated = true;
      return { quantity: n(part.quantity), unitCost: snapshotCost == null
        ? (part.material.defaultCost === null ? null : n(part.material.defaultCost)) : snapshotCost };
    });
    const cost = recipeLineCost(parts, restockedUnits, n(item.quantity));
    if (cost === null) { missingCosts++; continue; }
    estimatedProductCost += cost;
    const product = products.get(item.variantId ?? `line:${item.title}:${item.sku ?? ""}`);
    if (product) product.estimatedCost += cost;
  }
  const profit = profitMetrics(productRevenue, estimatedProductCost, missingCosts, costsEstimated);
  const roas = roasMetrics(sales.total, socialMediaSpend);
  for (const consumption of consumptions) {
    for (const item of consumption.items) {
      const row = materials.get(item.materialId) ?? { id: item.materialId, name: item.material.name, unit: item.unit, consumed: 0, orders: new Set<string>(), products: new Set<string>() };
      row.consumed += n(item.quantity); row.orders.add(consumption.orderId); row.products.add(consumption.variantId); materials.set(item.materialId, row);
    }
  }
  const byMaterial = new Map<string, { purchased: number; consumed: number; wasted: number; returned: number; adjusted: number }>();
  for (const transaction of transactions) {
    const row = byMaterial.get(transaction.materialId) ?? { purchased: 0, consumed: 0, wasted: 0, returned: 0, adjusted: 0 };
    const qty = n(transaction.quantity);
    if (transaction.type === "PURCHASE") row.purchased += qty;
    else if (transaction.type === "CONSUMPTION") row.consumed += qty;
    else if (transaction.type === "WASTE") row.wasted += qty;
    else if (transaction.type === "RETURN_RESTOCK") row.returned += qty;
    else if (transaction.type.startsWith("ADJUSTMENT")) row.adjusted += transaction.type.endsWith("OUT") ? -qty : qty;
    byMaterial.set(transaction.materialId, row);
  }
  const inventory = balances.map(balance => ({ id: balance.materialId, name: balance.material.name, type: balance.material.materialType.name, unit: balance.material.unit, stock: n(balance.quantity), reorderLevel: balance.material.reorderLevel === null ? null : n(balance.material.reorderLevel), ...byMaterial.get(balance.materialId) ?? { purchased: 0, consumed: 0, wasted: 0, returned: 0, adjusted: 0 }, estimatedValue: costingEnabled && balance.material.defaultCost !== null ? money(n(balance.quantity) * n(balance.material.defaultCost)) : null }));
  return {
    range: { period: range.period, from: range.from, to: range.to, timeZone: store.timezone }, currency: store.currency,
    notes: { excludedDifferentCurrencyOrders: unmatchedCurrencyOrders, salesRefundsAttributedToOriginalOrderDate: true, returnActivityAttributedToReturnDate: true, expenseTotalIncludesReturnCosts: true, costEstimateIncomplete: profit.incomplete },
    sales: { ...sales, total: money(sales.total), gross: money(sales.gross), discounts: money(sales.discounts), refunded: money(sales.refunded), net: money(sales.net), averageOrderValue: money(sales.averageOrderValue) },
    cash: { deposits: money(cash.deposits), deliveryBalances: money(cash.deliveryBalances), received: money(cash.received) },
    salesByDay: [...salesByDay.values()].map(row => ({ ...row, gross: money(row.gross), net: money(row.net) })),
    returns: { ...returnTotals, value: money(returnTotals.value), costs: money(returnTotals.costs) }, returnsByDay: [...returnsByDay.values()].map(row => ({ ...row, value: money(row.value) })),
    returnedProducts: [...returnedProducts.values()].sort((a, b) => b.units - a.units),
    products: [...products.values()].map(p => ({ ...p, gross: money(p.gross), discounts: money(p.discounts), refunds: money(p.refunds), net: money(p.net) })).sort((a, b) => b.net - a.net),
    expenses: { total: money(expenseTotal), returnCosts: money(returnExpenses), materialPurchases: money(purchaseExpenses), byCategory: [...expenseCategories.values()].map(c => ({ ...c, amount: money(c.amount) })).sort((a, b) => b.amount - a.amount), rows: expenses.map(e => ({ id: e.id, category: e.category.name, amount: n(e.amount), date: e.date, description: e.description, reference: e.reference })) },
    consumption: [...materials.values()].map(m => ({ id: m.id, name: m.name, unit: m.unit, consumed: m.consumed, orders: m.orders.size, products: m.products.size })).sort((a, b) => b.consumed - a.consumed),
    inventory, lowStock: inventory.filter(m => m.reorderLevel !== null && m.stock < m.reorderLevel),
    profit, roas,
    profitability: { estimatedProductCost: profit.recipeCost, estimatedGrossProfit: profit.profit,
      estimatedGrossMargin: profit.margin, incomplete: profit.incomplete, estimated: profit.estimated },
  };
}
