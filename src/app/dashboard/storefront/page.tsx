import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { activeProductStatus } from "@/lib/active-product";
import { getShopSettings } from "@/services/storefront/catalog";
import { StorefrontAdmin } from "@/components/storefront/StorefrontAdmin";
export default async function StorefrontPage() {
  const session = await requireAuth(); if (!can(session.role, "products.write")) throw new Error("Forbidden");
  const products = await db.product.findMany({ where: { storeId: session.storeId, ...activeProductStatus }, select: {
    id: true, title: true, storefrontPublished: true, storefrontDescription: true, storefrontCategory: true, storefrontImages: true, storefrontFeatured: true, storefrontInspiredBy: true, storefrontScentFamily: true, storefrontBadge: true,
    variants: { where: { active: true, price: { gt: 0 }, recipes: { some: { active: true, versions: { some: { isCurrent: true, items: { some: {} } } } } } }, select: { id: true } },
  }, orderBy: { title: "asc" } });
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-8"><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-[#96723c]">Auraic Store</p><h1 className="mt-1 text-3xl font-bold">إدارة المتجر</h1><p className="mt-2 text-sm text-slate-500">كل ما يظهر لعملائك، تحت سيطرتك.</p></div><Link href="/" target="_blank" className="rounded-xl border bg-white px-5 py-3 text-sm">معاينة المتجر ↗</Link></header>{process.env.STOREFRONT_STORE_ID !== session.storeId && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p>لربط واجهة المتجر بمتجرك، اضبط STOREFRONT_STORE_ID في إعدادات الاستضافة على:</p><code dir="ltr" className="mt-2 block select-all">{session.storeId}</code></div>}<StorefrontAdmin owner={session.role === "OWNER"} settings={await getShopSettings(session.storeId)} products={products.map(({ variants, ...product }) => ({ ...product, ready: variants.length > 0 }))} /></main>;
}
