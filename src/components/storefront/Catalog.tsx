"use client";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import { useState } from "react";
import type { ShopProduct } from "@/services/storefront/catalog";
import { formatMoney } from "@/lib/storefront/pricing";

export function ProductCard({ product }: { product: ShopProduct }) {
  const cart = useCart();
  return <article className="shop-product-wrap"><button type="button" className="shop-favorite" disabled={!cart.ready} onClick={() => cart.toggleFavorite(product.id)} aria-pressed={cart.favorites.includes(product.id)} aria-label={cart.favorites.includes(product.id) ? "حذف من المفضلة" : "إضافة للمفضلة"}>{cart.favorites.includes(product.id) ? "♥" : "♡"}</button><Link href={`/products/${product.id}`} className="shop-product-card"><div className="shop-product-image"><Image src={product.images[0] || "/auraic-bottle.svg"} alt={product.name} fill unoptimized={!!product.images.length} sizes="(max-width: 640px) 50vw, 25vw" />{product.featured && <span className="shop-product-badge">اختيار Auraic</span>}<span className="shop-product-arrow">↗</span></div><p>{product.category}</p><h3>{product.name}</h3><div><strong>{product.variants.length > 1 && "يبدأ من "}{formatMoney(product.variants[0].price)}</strong>{product.variants[0].compareAtPrice && <del>{formatMoney(product.variants[0].compareAtPrice)}</del>}<span>{product.variants.length > 1 ? `${product.variants.length} أحجام` : product.variants[0].title}</span></div></Link></article>;
}
export function Catalog({ products }: { products: ShopProduct[] }) {
  const [category, setCategory] = useState(""); const [search, setSearch] = useState(""); const [sort, setSort] = useState("default");
  const filtered = products.filter(product => (!category || product.category === category) && product.name.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "low" ? a.variants[0].price - b.variants[0].price : sort === "high" ? b.variants[0].price - a.variants[0].price : 0);
  return <><div className="shop-catalog-controls"><label className="shop-search"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="ابحث عن عطرك" aria-label="ابحث عن عطر" /></label><select value={sort} onChange={event => setSort(event.target.value)} aria-label="ترتيب المنتجات"><option value="default">ترتيب Auraic</option><option value="low">السعر: الأقل أولًا</option><option value="high">السعر: الأعلى أولًا</option></select></div><div className="shop-category-tabs"><button className={!category ? "active" : ""} onClick={() => setCategory("")}>كل العطور</button>{[...new Set(products.map(product => product.category))].map(value => <button key={value} className={category === value ? "active" : ""} onClick={() => setCategory(value)}>{value}</button>)}</div><p className="shop-result-count">{filtered.length} عطر</p><div className="shop-product-grid">{filtered.map(product => <ProductCard key={product.id} product={product} />)}</div>{!filtered.length && <div className="shop-empty"><h3>لا توجد عطور هنا بعد</h3><p>جرّب قسمًا آخر أو ارجع قريبًا لاكتشاف مجموعتنا.</p></div>}</>;
}
