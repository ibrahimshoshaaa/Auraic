import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { getCustomers } from "@/services/customer.service";
import { phoneDigits, normalizeCustomerPhone } from "@/lib/customers";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!can(session.role, "customers.read")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const p = req.nextUrl.searchParams;
    const customers = await getCustomers(session.storeId);
    const key = p.get("key");
    if (key) {
      const customer = customers.find(c => c.key === key);
      if (!customer) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
      const page = Math.max(1, Math.min(100000, Number.parseInt(p.get("page") ?? "1") || 1));
      const orders = await db.order.findMany({ where: { storeId: session.storeId, id: { in: customer.orderIds } },
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }], skip: (page - 1) * 20, take: 20,
        select: { id: true, orderNumber: true, occurredAt: true, currency: true, total: true, refunded: true,
          manualStatus: true, financialStatus: true, customerRef: true, customerPhone: true, customerAddress: true,
          items: { select: { title: true, quantity: true } },
          returns: { select: { id: true, status: true, totalAmount: true, returnCost: true, createdAt: true } } } });
      return NextResponse.json({ data: { ...customer, orderIds: undefined, orders }, page, pages: Math.ceil(customer.ordersCount / 20) }, { headers: { "Cache-Control": "no-store" } });
    }
    const q = (p.get("q") ?? "").trim().toLocaleLowerCase().slice(0, 100);
    const digits = phoneDigits(q);
    const phoneQuery = normalizeCustomerPhone(q) ?? digits.replace(/^00/, "");
    const filtered = customers.filter(c => !q || [c.name, c.address, c.phone].some(v => v.toLocaleLowerCase().includes(q)) || (digits.length > 0 && c.phone.includes(phoneQuery)));
    const sort = p.get("sort");
    const spent = (c: typeof customers[number]) => c.totals.EGP?.deliveredValue ?? 0;
    filtered.sort((a,b) => (sort === "orders" ? b.ordersCount - a.ordersCount : sort === "spent" ? spent(b) - spent(a) : b.lastOrderAt.localeCompare(a.lastOrderAt)) || a.key.localeCompare(b.key));
    const page = Math.max(1, Math.min(100000, Number.parseInt(p.get("page") ?? "1") || 1));
    const totals: Record<string, number> = {};
    for (const c of customers) for (const [currency, values] of Object.entries(c.totals)) totals[currency] = (totals[currency] ?? 0) + values.deliveredValue;
    return NextResponse.json({ data: filtered.slice((page - 1) * 20, page * 20).map(c => ({ ...c, orderIds: undefined })),
      count: filtered.length, page, pages: Math.ceil(filtered.length / 20),
      stats: { total: customers.length, repeat: customers.filter(c => c.ordersCount > 1).length,
        unidentified: customers.filter(c => !c.phone).length, delivered: totals } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error(error); return NextResponse.json({ error: "تعذر تحميل العملاء" }, { status: 500 });
  }
}
