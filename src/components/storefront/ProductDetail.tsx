"use client";
import { ShopIcon } from "./ShopIcon";
import Image from "next/image";
import Link from "next/link";
import { useShopNavigation } from "./ShopNavigation";
import { useEffect, useRef, useState } from "react";
import type { ShopProduct } from "@/services/storefront/catalog";
import { formatMoney } from "@/lib/storefront/pricing";
import { productAudience } from "@/lib/storefront/collections";
import { useCart } from "./CartProvider";
export function ProductDetail({ product, enabled }: { product: ShopProduct; enabled: boolean }) {
  const [variantId, setVariantId] = useState((product.variants.find(item => /^100\s*(ml|مل)?$/i.test(item.title.trim())) || product.variants[0]).id);
  const [quantity, setQuantity] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [added, setAdded] = useState(false);
  const [galleryPaused, setGalleryPaused] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const cart = useCart(); const navigate = useShopNavigation();
  const variant = product.variants.find(item => item.id === variantId)!;
  const images = product.images.length ? product.images : ["/auraic-bottle.svg"];
  const imageCount = images.length;
  useEffect(() => {
    if (imageCount < 2 || galleryPaused) return;
    const timer = window.setInterval(() => setPhoto(current => (current + 1) % imageCount), 2000);
    return () => window.clearInterval(timer);
  }, [imageCount, galleryPaused, photo]);
  function changePhoto(direction: number) {
    setPhoto(current => (current + direction + imageCount) % imageCount);
  }
  const disabled = !enabled || !cart.ready || (cart.lines.length >= 20 && !cart.lines.some(item => item.variantId === variant.id));
  function add() { cart.add({ variantId: variant.id, productId: product.id, name: product.name, size: variant.title, image: images[0], quantity }); setAdded(true); }
  const label = !enabled ? "Orders paused" : added ? "✓ Added to bag" : "Add to bag";
  return <div className="shop-detail shop-fragrance-detail">
    <section className="shop-gallery" aria-label={`${product.name} photos`}>
      <div className="shop-detail-image shop-swipe-gallery" tabIndex={imageCount > 1 ? 0 : undefined}
        aria-label="Product images. Swipe left or right, or use the arrow keys to change image."
        onMouseEnter={() => setGalleryPaused(true)} onMouseLeave={() => setGalleryPaused(false)}
        onFocus={e => setGalleryPaused(e.currentTarget.matches(":focus-visible"))} onBlur={() => setGalleryPaused(false)}
        onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); changePhoto(e.key === "ArrowRight" ? 1 : -1); } }}
        onPointerDown={e => {
          if (!e.isPrimary || e.button !== 0 || imageCount < 2) return;
          swipeStart.current = { x: e.clientX, y: e.clientY };
          setGalleryPaused(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={e => {
          const start = swipeStart.current;
          swipeStart.current = null;
          if (start) {
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy)) changePhoto(dx < 0 ? 1 : -1);
          }
          setGalleryPaused(e.pointerType === "mouse" || e.currentTarget.matches(":focus-visible"));
        }}
        onPointerCancel={() => { swipeStart.current = null; setGalleryPaused(false); }}>
        <div className="shop-gallery-track" style={{ transform: `translateX(-${photo * 100}%)` }}>
          {images.map((image, index) => <div className="shop-gallery-slide" key={image + index} aria-hidden={photo !== index}>
            <Image src={image} alt={`${product.name} — photo ${index + 1}`} fill unoptimized sizes="(max-width: 760px) 100vw, 50vw" priority={index === 0} draggable={false} />
          </div>)}
        </div>
        <span className="shop-gallery-count">{photo + 1} / {imageCount}</span>
      </div>
      <div className="shop-thumbnails">{images.map((image, index) => <button type="button" key={image + index} onClick={() => setPhoto(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={photo === index}><Image src={image} width={90} height={100} alt="" unoptimized /></button>)}</div>
    </section>
    <section className="shop-detail-copy">
      {product.inspiredBy && <p className="shop-inspired"><span>INSPIRED BY</span><strong>{product.inspiredBy}</strong></p>}
      <div className="shop-fragrance-tags"><span>{productAudience(product.category) === "men" ? "FOR MEN" : productAudience(product.category) === "women" ? "FOR WOMEN" : "UNISEX"}</span>{product.scentFamily && <span>{product.scentFamily}</span>}</div>
      <h1>{product.name}</h1>
      <button type="button" className="shop-favorite-detail" disabled={!cart.ready} onClick={() => cart.toggleFavorite(product.id)} aria-pressed={cart.favorites.includes(product.id)}><ShopIcon name="heart" fill={cart.favorites.includes(product.id) ? "currentColor" : "none"}/>{cart.favorites.includes(product.id) ? "Saved to wishlist" : "Add to wishlist"}</button>
      <p className="shop-description">{product.description || "Choose your size and discover the Auraic experience."}</p>
      <p className="shop-detail-price">{variant.compareAtPrice && <del>{formatMoney(variant.compareAtPrice)}</del>} {formatMoney(variant.price)}</p>
      <h3>CHOOSE SIZE</h3><div className="shop-variant-buttons">{product.variants.map(item => <button type="button" aria-pressed={item.id === variantId} key={item.id} onClick={() => { setVariantId(item.id); setAdded(false); }}><strong>{item.title}</strong><small>{formatMoney(item.price)}</small></button>)}</div>
      <div className="shop-add-row"><div className="shop-quantity"><button type="button" aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => { setQuantity(quantity - 1); setAdded(false); }}>−</button><span>{quantity}</span><button type="button" aria-label="Increase quantity" disabled={quantity === 20} onClick={() => { setQuantity(quantity + 1); setAdded(false); }}>+</button></div><button type="button" disabled={disabled} className="shop-button" onClick={add}>{label} · {formatMoney(variant.price * quantity)}</button></div>
      <button type="button" className="shop-button shop-buy-now" disabled={disabled} onClick={() => { add(); navigate("/checkout"); }}>Buy now<ShopIcon name="arrow"/></button>
      <p role="status" className="shop-add-status">{added && <Link href="/cart">Added to your bag · View bag →</Link>}</p>
      <details className="shop-policy"><summary>Shipping & payment</summary><p>Pay on delivery. Your shipping cost is shown before you confirm. <Link href="/shipping">Delivery information</Link></p></details><details className="shop-policy"><summary>Returns & exchanges</summary><p>Read our <Link href="/returns">returns and exchanges policy</Link>.</p></details>
    </section>
    <aside className="shop-sticky-bag" aria-label="Quick add to bag"><div className="shop-sticky-summary"><div className="shop-sticky-product"><Image src={images[0]} alt="" width={36} height={42} unoptimized/><strong>{product.name}</strong></div><strong className="shop-sticky-price">{formatMoney(variant.price * quantity)}</strong></div><label><span className="sr-only">Choose size</span><select value={variantId} onChange={e => { setVariantId(e.target.value); setAdded(false); }}>{product.variants.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><button type="button" className="shop-button" disabled={disabled} onClick={add}>{label}<ShopIcon name="bag"/></button></aside>
  </div>;
}
