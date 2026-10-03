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
    <div className="grid gap-3 sm:grid-cols-2">{products.map(product => <Link key={product.id} href={`/dashboard/products/${product.id}`} className="flex min-h-24 items-center justify-between gap-3 rounded-2xl border border-[#e5e4ec] bg-white p-5 shadow-sm transition hover:border-[#aaa5cf]">
      <div className="min-w-0"><h2 className="truncate text-lg font-bold text-[#191735]">{product.title}</h2><p className="mt-1 text-sm text-slate-500">{product.variants.length} {product.variants.length === 1 ? "حجم" : "أحجام"} · {product.storefrontPublished ? "منشور في المتجر" : "غير منشور"}</p><p className="mt-1 text-xs text-slate-500">{product.variants.filter(variant => variant.recipes[0]?.versions[0]?.items.length).length} وصفة مسجلة</p></div><span aria-hidden="true" className="text-2xl text-[#625f89]">←</span>
    </Link>)}</div>
  </main>;
}
