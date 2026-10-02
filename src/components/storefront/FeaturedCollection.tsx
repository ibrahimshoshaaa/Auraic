"use client";
import Link from "next/link";
import { useState } from "react";
import { ProductCard } from "./Catalog";
import type { ShopSettings } from "@/lib/storefront/config";
import type { ShopProduct } from "@/services/storefront/catalog";
export function FeaturedCollection({ products, settings }: { products: ShopProduct[]; settings: ShopSettings }) {
  const [showNotes, setShowNotes] = useState(false);
  return <section className="shop-section shop-featured" id="products"><header className="shop-section-heading"><div><p className="shop-eyebrow">{settings.featuredEyebrow}</p><h2 style={{ whiteSpace: "pre-line" }}>{settings.featuredTitle}</h2></div><div className="shop-featured-controls"><Link href="/products">VIEW ALL <span>⟶</span></Link><button type="button" role="switch" aria-checked={showNotes} onClick={() => setShowNotes(!showNotes)} className="shop-notes-toggle"><span className="shop-toggle-track"><span/></span><span>SHOW<br/>NOTES</span></button></div></header><div className="shop-product-grid">{products.map(product => <ProductCard key={product.id} product={product} showNotes={showNotes}/>)}</div>{!products.length && <p className="shop-empty">Our next collection is on its way. Check back soon.</p>}</section>;
}
