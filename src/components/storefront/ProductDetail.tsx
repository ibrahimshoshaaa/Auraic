"use client";
import Image from "next/image";
import Link from "next/link";
import { useShopNavigation } from "./ShopNavigation";
import { useState } from "react";
import type { ShopProduct } from "@/services/storefront/catalog";
import { formatMoney } from "@/lib/storefront/pricing";
import { productAudience } from "@/lib/storefront/collections";
import { useCart } from "./CartProvider";
export function ProductDetail({ product, enabled }: { product: ShopProduct; enabled: boolean }) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [quantity, setQuantity] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [added, setAdded] = useState(false);
  const cart = useCart(); const navigate = useShopNavigation();
  const variant = product.variants.find(item => item.id === variantId)!;
  const images = product.images.length ? product.images : ["/auraic-bottle.svg"];
  const disabled = !enabled || !cart.ready || (cart.lines.length >= 20 && !cart.lines.some(item => item.variantId === variant.id));
  function add() { cart.add({ variantId: variant.id, productId: product.id, name: product.name, size: variant.title, image: images[0], quantity }); setAdded(true); }
  const label = !enabled ? "Orders paused" : added ? "✓ Added to bag" : "Add to bag";
  return <div className="shop-detail shop-fragrance-detail">
    <section className="shop-gallery" aria-label={`${product.name} photos`}>
      <div className="shop-detail-image" tabIndex={images.length > 1 ? 0 : undefined} onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); setPhoto((photo + (e.key === "ArrowRight" ? 1 : -1) + images.length) % images.length); } }}>
        <Image src={images[photo]} alt={`${product.name} — photo ${photo + 1}`} fill unoptimized sizes="(max-width: 760px) 100vw, 50vw" priority />
        {images.length > 1 && <><button type="button" className="shop-gallery-prev" aria-label="Previous photo" onClick={() => setPhoto((photo - 1 + images.length) % images.length)}>⟵</button><button type="button" className="shop-gallery-next" aria-label="Next photo" onClick={() => setPhoto((photo + 1) % images.length)}>⟶</button></>}
        <span className="shop-gallery-count">{photo + 1} / {images.length}</span>
      </div>
      <div className="shop-thumbnails">{images.map((image, index) => <button type="button" key={image + index} onClick={() => setPhoto(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={photo === index}><Image src={image} width={90} height={100} alt="" unoptimized /></button>)}</div>
    </section>
    <section className="shop-detail-copy">
      {product.inspiredBy && <p className="shop-inspired"><span>INSPIRED BY</span><strong>{product.inspiredBy}</strong></p>}
      <div className="shop-fragrance-tags"><span>{productAudience(product.category) === "men" ? "FOR MEN" : productAudience(product.category) === "women" ? "FOR WOMEN" : "UNISEX"}</span>{product.scentFamily && <span>{product.scentFamily}</span>}</div>
      <h1>{product.name}</h1>
      <button type="button" className="shop-favorite-detail" disabled={!cart.ready} onClick={() => cart.toggleFavorite(product.id)} aria-pressed={cart.favorites.includes(product.id)}>{cart.favorites.includes(product.id) ? "♥ Saved to wishlist" : "♡ Add to wishlist"}</button>
      <p className="shop-description">{product.description || "Choose your size and discover the Auraic experience."}</p>
      <p className="shop-detail-price">{variant.compareAtPrice && <del>{formatMoney(variant.compareAtPrice)}</del>} {formatMoney(variant.price)}</p>
      <h3>CHOOSE SIZE</h3><div className="shop-variant-buttons">{product.variants.map(item => <button type="button" aria-pressed={item.id === variantId} key={item.id} onClick={() => { setVariantId(item.id); setAdded(false); }}><strong>{item.title}</strong><small>{formatMoney(item.price)}</small></button>)}</div>
      <div className="shop-add-row"><div className="shop-quantity"><button type="button" aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => { setQuantity(quantity - 1); setAdded(false); }}>−</button><span>{quantity}</span><button type="button" aria-label="Increase quantity" disabled={quantity === 20} onClick={() => { setQuantity(quantity + 1); setAdded(false); }}>+</button></div><button type="button" disabled={disabled} className="shop-button" onClick={add}>{label} · {formatMoney(variant.price * quantity)}</button></div>
      <button type="button" className="shop-button shop-buy-now" disabled={disabled} onClick={() => { add(); navigate("/checkout"); }}>Buy now →</button>
      <p role="status" className="shop-add-status">{added && <Link href="/cart">Added to your bag · View bag →</Link>}</p>
      <details className="shop-policy"><summary>Shipping & payment</summary><p>Pay on delivery. Your shipping cost is shown before you confirm. <Link href="/shipping">Delivery information</Link></p></details><details className="shop-policy"><summary>Returns & exchanges</summary><p>Read our <Link href="/returns">returns and exchanges policy</Link>.</p></details>
    </section>
    <aside className="shop-sticky-bag" aria-label="Quick add to bag"><div className="shop-sticky-product"><Image src={images[0]} alt="" width={40} height={50} unoptimized/><strong>{product.name}</strong></div><label><span className="sr-only">Choose size</span><select value={variantId} onChange={e => { setVariantId(e.target.value); setAdded(false); }}>{product.variants.map(item => <option key={item.id} value={item.id}>{item.title} · {formatMoney(item.price)}</option>)}</select></label><button type="button" className="shop-button" disabled={disabled} onClick={add}>{label} →</button></aside>
  </div>;
}
