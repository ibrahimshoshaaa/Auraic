"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ShopProduct } from "@/services/storefront/catalog";
import { formatMoney } from "@/lib/storefront/pricing";
import { useCart } from "./CartProvider";
export function ProductDetail({ product, enabled }: { product: ShopProduct; enabled: boolean }) {
  const [variantId, setVariantId] = useState(product.variants[0].id); const [quantity, setQuantity] = useState(1); const [photo, setPhoto] = useState(0); const [added, setAdded] = useState(false); const cart = useCart();
  const variant = product.variants.find(item => item.id === variantId)!;
  const images = product.images.length ? product.images : ["/auraic-bottle.svg"];
  return <div className="shop-detail"><div><div className="shop-detail-image"><Image src={images[photo]} alt={product.name} fill unoptimized sizes="(max-width: 760px) 90vw, 50vw" priority /></div>{images.length > 1 && <div className="shop-thumbnails">{images.map((image, index) => <button key={image + index} onClick={() => setPhoto(index)} aria-label={`صورة ${index + 1}`} aria-pressed={photo === index}><Image src={image} width={80} height={90} alt="" unoptimized /></button>)}</div>}</div>
    <div className="shop-detail-copy"><p className="shop-eyebrow">{product.category}</p><h1>{product.name}</h1><p className="shop-detail-price">{formatMoney(variant.price)}</p><p className="shop-description">{product.description || "اختر الحجم المناسب لك واستمتع بتجربة Auraic."}</p><h3>اختر الحجم</h3><div className="shop-variant-buttons">{product.variants.map(item => <button aria-pressed={item.id === variantId} key={item.id} onClick={() => { setVariantId(item.id); setAdded(false); }}>{item.title}</button>)}</div><div className="shop-add-row"><div className="shop-quantity"><button aria-label="تقليل الكمية" disabled={quantity === 1} onClick={() => setQuantity(quantity - 1)}>−</button><span>{quantity}</span><button aria-label="زيادة الكمية" disabled={quantity === 20} onClick={() => setQuantity(quantity + 1)}>+</button></div><button disabled={!enabled || !cart.ready || cart.lines.length >= 20 && !cart.lines.some(item => item.variantId === variant.id)} className="shop-button" onClick={() => { cart.add({ variantId: variant.id, productId: product.id, name: product.name, size: variant.title, image: images[0], quantity }); setAdded(true); }}>{!enabled ? "استقبال الطلبات متوقف حاليًا" : added ? "✓ أُضيف إلى حقيبتك" : "أضف إلى الحقيبة"}</button></div>{added && <Link className="shop-inline-link" href="/cart">تابع إلى حقيبة التسوق ←</Link>}<p className="shop-detail-note">الدفع عند الاستلام · راجع <Link href="/shipping">سياسة الشحن</Link></p></div></div>;
}
