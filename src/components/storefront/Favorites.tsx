"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { ProductCard } from "./Catalog";
import type { ShopProduct } from "@/services/storefront/catalog";
export function Favorites({ products, enabled }: { products: ShopProduct[]; enabled: boolean }) {
  const { favorites, ready, toggleFavorite } = useCart();
  if (!ready) return <p role="status">Loading your wishlist…</p>;
  const selected = products.filter(product => favorites.includes(product.id));
  const unavailable = favorites.filter(id => !products.some(product => product.id === id));
  return <><p className="shop-result-count">{selected.length} fragrances saved on this device</p>{selected.length ? <div className="shop-product-grid">{selected.map(product => <ProductCard key={product.id} product={product} enabled={enabled} />)}</div> : <section className="shop-empty"><h2>Your wishlist is waiting</h2><p>Tap the heart on a fragrance to save it here.</p><Link href="/products" className="shop-button">Explore fragrances →</Link></section>}{unavailable.length > 0 && <section className="shop-empty"><p>{unavailable.length} saved fragrances are no longer available.</p><button onClick={() => unavailable.forEach(toggleFavorite)}>Remove unavailable fragrances</button></section>}</>;
}
