import { AdminProductPreview } from "@/components/products/AdminProductPreview";
import { isSample } from "@/lib/storefront/collections";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { activeProductStatus } from "@/lib/active-product";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const samples = (await searchParams).type === "samples";
  const session = await requireAuth();
  if (!can(session.role, "products.read")) throw new Error("Forbidden");
  const allProducts = await db.product.findMany({
    where: { storeId: session.storeId, ...activeProductStatus },
    include: { variants: { where: { active: true }, include: { recipes: { include: { versions: { where: { isCurrent: true }, include: { items: { include: { material: { select: { name: true, unit: true } } } } } } } } } } },
    orderBy: { title: "asc" },
  });
  const products = allProducts.filter(product => isSample(product.storefrontCategory) === samples);
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-8 sm:py-9">
    <header><h1 className="text-3xl font-bold">المنتجات</h1><p className="mt-2 text-sm text-slate-500">العطور والسامبلز · الأحجام والوصفات والنشر</p></header>
    {can(session.role, "products.write") && <div className="grid grid-cols-2 gap-3">{[["fragrances", "إضافة عطر وأحجامه"], ["samples", "إضافة سامبلز"]].map(([type, label]) => <Link key={type} href={`/dashboard/products/new?type=${type}`} className="rounded-xl bg-[#191735] px-3 py-4 text-center text-sm font-semibold text-white">+ {label}</Link>)}</div>}
    <nav aria-label="نوع المنتجات" className="grid grid-cols-2 gap-3">{[[false, "العطور"], [true, "السامبلز"]].map(([sample, label]) => <Link key={String(sample)} aria-current={samples === sample ? "page" : undefined} href={sample ? "/dashboard/products?type=samples" : "/dashboard/products"} className={`rounded-xl border px-4 py-3 text-center font-semibold ${samples === sample ? "bg-[#191735] text-white" : "bg-white text-[#191735]"}`}>{label}</Link>)}</nav>
    {!products.length && <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد منتجات في هذا القسم بعد.</p>}
    <div className="grid grid-cols-2 items-start gap-3 lg:grid-cols-3">{products.map(product => <Link key={product.id} href={`/dashboard/products/${product.id}`} className="overflow-hidden rounded-2xl bg-[#3F3A60] shadow-sm transition hover:shadow-lg focus-visible:outline-2 focus-visible:outline-[#96723c]">
      <AdminProductPreview product={{ ...product, variants: product.variants.map(variant => ({ ...variant, price: Number(variant.price), compareAtPrice: variant.compareAtPrice == null ? null : Number(variant.compareAtPrice) })) }} />
      <div className="flex items-center justify-between gap-2 px-3 pb-4 text-xs text-[#FAEAB1]"><span>{product.variants.filter(variant => variant.recipes[0]?.versions[0]?.items.length).length} وصفة مسجلة</span><span>عرض التفاصيل ←</span></div>
    </Link>)}</div>
  </main>;
}
