"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { ProductCard } from "./Catalog";
import type { ShopProduct } from "@/services/storefront/catalog";
export function Favorites({ products }: { products: ShopProduct[] }) {
  const { favorites, ready, toggleFavorite } = useCart();
  if (!ready) return <p role="status">تحميل المفضلة…</p>;
  const selected = products.filter(product => favorites.includes(product.id));
  const unavailable = favorites.filter(id => !products.some(product => product.id === id));
  return <><p className="shop-result-count">{selected.length} عطر محفوظ على هذا الجهاز</p>{selected.length ? <div className="shop-product-grid">{selected.map(product => <ProductCard key={product.id} product={product} />)}</div> : <section className="shop-empty"><h2>المفضلة تنتظر عطرك</h2><p>اضغط على القلب بجانب العطر لتحفظه هنا.</p><Link href="/products" className="shop-button">اكتشف العطور ←</Link></section>}{unavailable.length > 0 && <section className="shop-empty"><p>{unavailable.length} عطر محفوظ لم يعد متاحًا في المتجر.</p><button onClick={() => unavailable.forEach(toggleFavorite)}>إزالة العطور غير المتاحة</button></section>}</>;
}
