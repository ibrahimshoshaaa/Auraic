import { isSample } from "@/lib/storefront/collections";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import { ProductCard } from "@/components/storefront/Catalog";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const shop = await getPublicShop(); if (!shop) return null;
  const { id } = await params; const items = await getPublicProducts(shop.id, "all");
  if (items.some(item => item.id === id && isSample(item.category))) redirect("/samples");
  const all = await getPublicProducts(shop.id);
  const product = all.find(item => item.id === id); if (!product) notFound();
  return <main className="shop-section"><p className="shop-breadcrumb"><Link href="/">Home</Link> / <Link href="/products">Fragrances</Link> / {product.name}</p><ProductDetail product={product} enabled={shop.settings.enabled} />{all.length > 1 && <section className="shop-related"><h2>You may also like</h2><div className="shop-product-grid">{all.filter(item => item.id !== id).slice(0, 4).map(item => <ProductCard key={item.id} product={item} enabled={shop.settings.enabled} />)}</div></section>}</main>;
}
