"use client";
import Link from "next/link";
import { useState } from "react";
import { ProductCard } from "./Catalog";
import type { ShopSettings } from "@/lib/storefront/config";
import type { ShopProduct } from "@/services/storefront/catalog";
export function FeaturedCollection({ products, settings, title, eyebrow, href = "/products", id = "products" }: { products: ShopProduct[]; settings: ShopSettings; title?: string; eyebrow?: string; href?: string; id?: string }) {
  const [showNotes, setShowNotes] = useState(false);
  return <section className="shop-section shop-featured" id={id}><header className="shop-section-heading"><div><p className="shop-eyebrow">{eyebrow ?? settings.featuredEyebrow}</p><h2 style={{ whiteSpace: "pre-line" }}>{title ?? settings.featuredTitle}</h2></div><div className="shop-featured-controls"><Link href={href}>VIEW ALL <span>⟶</span></Link><button type="button" role="switch" aria-checked={showNotes} onClick={() => setShowNotes(!showNotes)} className="shop-notes-toggle"><span className="shop-toggle-track"><span/></span><span>SHOW<br/>NOTES</span></button></div></header><div className="shop-product-grid">{products.map(product => <ProductCard key={product.id} product={product} enabled={settings.enabled} showNotes={showNotes}/>)}</div>{products.length > 0 && <Link className="shop-browse-collection" href={href}>BROWSE ALL COLLECTIONS <span>⟶</span></Link>}{!products.length && <p className="shop-empty">Our next collection is on its way. Check back soon.</p>}</section>;
}
