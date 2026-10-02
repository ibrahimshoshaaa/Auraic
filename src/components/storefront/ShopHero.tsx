"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ShopSettings } from "@/lib/storefront/config";
export function ShopHero({ settings }: { settings: ShopSettings }) {
  const [slide, setSlide] = useState(0); const [paused, setPaused] = useState(false); const [videoFailed, setVideoFailed] = useState(false); const video = useRef<HTMLVideoElement>(null);
  const isVideo = settings.heroMode === "video" && !!settings.heroVideo && !videoFailed;
  const images = settings.heroImages;
  useEffect(() => {
    if (isVideo || images.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => { if (!document.hidden) setSlide(current => (current + 1) % images.length); }, settings.heroInterval * 1000);
    return () => window.clearInterval(timer);
  }, [isVideo, images.length, paused, settings.heroInterval]);
  useEffect(() => { if (!isVideo || !video.current) return; if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPaused(true); return; } video.current.play().catch(() => setPaused(true)); }, [isVideo]);
  function toggle() { if (isVideo && video.current) { if (video.current.paused) video.current.play().then(() => setPaused(false)).catch(() => setPaused(true)); else { video.current.pause(); setPaused(true); } } else setPaused(!paused); }
  return <section className={`shop-hero shop-editorial-hero ${images.length || isVideo ? "has-photo" : ""}`} aria-label="Auraic collection">
    {isVideo ? <video ref={video} className="shop-hero-video" src={settings.heroVideo} poster={images[0]} muted loop playsInline preload="metadata" onError={() => setVideoFailed(true)} onPlay={() => setPaused(false)} onPause={() => setPaused(true)} /> : images.length > 0 ? <div className="shop-hero-photos">{images.map((image, index) => <Image key={image + index} src={image} alt={index === slide % images.length ? "Auraic fragrances" : ""} fill unoptimized priority={index === 0} sizes="100vw" className={index === slide % images.length ? "active" : ""}/>)}</div> : <div className="shop-hero-fallback"><Image src="/auraic-bottle.svg" alt="" fill priority sizes="100vw"/></div>}
    <div className="shop-hero-copy"><h1>{settings.heroTitle}</h1><div className="shop-hero-collections">{[["men", settings.menCollectionLabel], ["women", settings.womenCollectionLabel]].map(([category, label]) => <Link key={category + label} href={`/products?audience=${category}`} className="shop-collection-button"><span className="shop-button-brand" aria-hidden="true">Auraic<small>FRAGRANCES</small></span><span>{label}</span></Link>)}</div></div>
    {!isVideo && images.length > 1 && <div className="shop-slider-dots">{images.map((_, index) => <button key={index} type="button" aria-label={`Show image ${index + 1}`} aria-pressed={index === slide % images.length} onClick={() => setSlide(index)}/>)}</div>}
    {(isVideo || images.length > 1) && <button type="button" className="shop-hero-pause" onClick={toggle} aria-label={paused ? "Play hero media" : "Pause hero media"}>{paused ? "▶" : "Ⅱ"}</button>}
  </section>;
}
