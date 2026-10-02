import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { can } from "@/lib/rbac";
import { ProductEditor } from "@/components/products/ProductEditor";

export default async function NewProductPage() {
  const session = await requireAuth();
  if (!can(session.role, "products.write")) throw new Error("Forbidden");
  const materials = await db.material.findMany({ where: { storeId: session.storeId, active: true }, include: { materialType: { select: { name: true } } }, orderBy: { name: "asc" } });
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-8 sm:py-9"><header><Link href="/dashboard/products" className="text-sm font-semibold text-[#514b8c]">← المنتجات</Link><h1 className="mt-3 text-3xl font-bold">إضافة منتج</h1><p className="mt-2 text-sm text-slate-500">أضف بيانات المنتج وصوره ووصفته، ثم راجع التفاصيل وانشره في المتجر من نفس الشاشة.</p></header><ProductEditor materials={materials.map((material) => ({ id: material.id, name: material.name, unit: material.unit, category: material.materialType.name }))} /></main>;
}
