"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ShopSettings } from "@/lib/storefront/config";
export function ShopHero({ settings }: { settings: ShopSettings }) {
  const [slide, setSlide] = useState(0);
  useEffect(() => { if (settings.heroImages.length < 2) return; const interval = setInterval(() => setSlide(current => (current + 1) % settings.heroImages.length), 6000); return () => clearInterval(interval); }, [settings.heroImages.length]);
  return <section className={`shop-hero ${settings.heroImages.length ? "has-photo" : ""}`}>
    {settings.heroImages.length > 0 && <div className="shop-hero-photos">{settings.heroImages.map((image, index) => <Image key={image + index} src={image} alt="" fill unoptimized priority={index === 0} className={index === slide ? "active" : ""} />)}</div>}
    <div className="shop-hero-copy"><span className="shop-eyebrow">THE AURAIC EXPERIENCE</span><h1>{settings.heroTitle}</h1><p>{settings.heroSubtitle}</p><Link className="shop-button gold" href="/products">اكتشف عطرك <span>←</span></Link><small>DESIGNED TO BE FELT, NOT JUST SMELLED</small></div>
    {!settings.heroImages.length && <div className="shop-hero-art"><div className="shop-orbit"/><Image src="/auraic-bottle.svg" width={600} height={700} alt="" priority /><span>A scent. A feeling. An Aura.</span></div>}
    {settings.heroImages.length > 1 && <div className="shop-slider-dots">{settings.heroImages.map((_, index) => <button key={index} aria-label={`البانر ${index + 1}`} aria-pressed={index === slide} onClick={() => setSlide(index)} />)}</div>}
  </section>;
}
