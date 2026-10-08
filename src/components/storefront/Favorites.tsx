"use client";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { ProductCard } from "./Catalog";
import { ShopIcon } from "./ShopIcon";
import type { ShopProduct } from "@/services/storefront/catalog";
export function Favorites({ products, enabled }: { products: ShopProduct[]; enabled: boolean }) {
  const { favorites, ready, toggleFavorite } = useCart();
  if (!ready) return <p className="shop-wishlist-loading" role="status">Loading your wishlist…</p>;
  const selected = products.filter(product => favorites.includes(product.id));
  const unavailable = favorites.filter(id => !products.some(product => product.id === id));
  return <div className="shop-wishlist-content"><p className="shop-result-count">{selected.length} {selected.length === 1 ? "fragrance" : "fragrances"} saved on this device</p>{selected.length ? <div className="shop-product-grid">{selected.map(product => <ProductCard key={product.id} product={product} enabled={enabled} />)}</div> : <section className="shop-empty shop-wishlist-empty"><div className="shop-wishlist-heart" aria-hidden="true"><ShopIcon name="heart" /></div><p className="shop-wishlist-kicker">A LITTLE SOMETHING TO LOVE</p><h2>Your wishlist is waiting</h2><p>Found a fragrance you love? Tap the heart to keep it close.</p><Link href="/products" className="shop-button shop-wishlist-cta">Explore fragrances <span aria-hidden="true">→</span></Link></section>}{unavailable.length > 0 && <section className="shop-empty"><p>{unavailable.length} saved fragrances are no longer available.</p><button onClick={() => unavailable.forEach(toggleFavorite)}>Remove unavailable fragrances</button></section>}</div>;
}
