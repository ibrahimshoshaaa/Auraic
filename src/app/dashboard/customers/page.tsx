import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { Customers } from "@/components/customers/Customers";
export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireAuth();
  if (!can(session.role, "customers.read")) throw new Error("Forbidden");
  const { q } = await searchParams;
  return <Customers initialQuery={(q ?? "").slice(0, 100)} canCreateOrder={can(session.role, "orders.write")} />;
}
