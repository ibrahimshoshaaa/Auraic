import type { Role } from "@prisma/client";

export const rolePermissions = {
  OWNER: ["*"],
  MANAGER: [
    "dashboard.read",
    "orders.read",
    "orders.write",
    "customers.read",
    "products.read",
    "products.write",
    "materials.read",
    "materials.write",
    "recipes.read",
    "recipes.write",
    "inventory.read",
    "inventory.write",
    "consumption.read",
    "consumption.write",
    "returns.read",
    "returns.write",
    "expenses.read",
    "expenses.write",
    "reports.read",
  ],
  EMPLOYEE: [
    "dashboard.read",
    "orders.read",
    "materials.read",
    "inventory.read",
    "consumption.read",
  ],
} as const;

export type AccessPrincipal = { role: Role; permissions?: readonly string[] };
export function effectivePermissions(principal: Role | AccessPrincipal): readonly string[] {
  const role = typeof principal === "string" ? principal : principal.role;
  if (role === "OWNER") return ["*"];
  if (typeof principal !== "string" && principal.permissions !== undefined) return principal.permissions;
  const legacy: readonly string[] = rolePermissions[role];
  return [...legacy, "costs.read", "settings.read", ...(role === "MANAGER" ? ["profits.read", "traffic.read", "reports.export", "payments.read", "payments.write", "storefront.read", "coupons.read", "coupons.write", "settings.read"] : [])];
}
export function can(principal: Role | AccessPrincipal, permission: string) {
  const permissions = effectivePermissions(principal);
  return permissions.includes("*") || permissions.includes(permission);
}
