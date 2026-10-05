"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ShopSettings } from "@/lib/storefront/config";
function ScreenshotReviews({ images, title }: { images: string[]; title: string }) {
  const rail = useRef<HTMLDivElement>(null); const [active, setActive] = useState(0);
  return <section className="shop-review-section shop-customer-reviews" aria-label={title}><span className="shop-eyebrow">FROM OUR CUSTOMERS</span><h2>{title}</h2><div ref={rail} className="shop-review-rail shop-screenshot-rail" onScroll={() => { const node = rail.current; if (!node) return; const children = Array.from(node.children) as HTMLElement[]; setActive(children.reduce((best, item, index) => Math.abs(item.offsetLeft - node.offsetLeft - node.scrollLeft) < Math.abs(children[best].offsetLeft - node.offsetLeft - node.scrollLeft) ? index : best, 0)); }}>{images.map((src, index) => <div className="shop-review-screenshot" key={src + index}><Image src={src} alt={`Customer review ${index + 1}`} width={900} height={1100} unoptimized sizes="(max-width:760px) 90vw, 700px"/></div>)}</div>{images.length > 1 && <div className="shop-review-dots">{images.map((_, index) => <button type="button" key={index} aria-label={`Show customer review ${index + 1}`} aria-pressed={active === index} onClick={() => { const node = rail.current; const child = node?.children[index] as HTMLElement | undefined; if (node && child) node.scrollTo({ left: child.offsetLeft - node.offsetLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}/>)}</div>}</section>;
}
export function ReviewSections({ settings }: { settings: ShopSettings }) {
  return <>{settings.bloggerReviewsEnabled && settings.bloggerReviewVideos.length > 0 && <section className="shop-review-section shop-blogger-reviews" aria-label={settings.bloggerReviewsTitle}><span className="shop-eyebrow">THE AURAIC EXPERIENCE</span><h2>{settings.bloggerReviewsTitle}</h2><p>Real impressions. Discover the fragrances they love.</p><div className="shop-review-rail">{settings.bloggerReviewVideos.map((src, index) => <ReviewReel key={src + index} src={src} index={index}/>)}</div></section>}{settings.customerReviewsEnabled && settings.customerReviewImages.length > 0 && <ScreenshotReviews images={settings.customerReviewImages} title={settings.customerReviewsTitle}/>}</>;
}

function ReviewReel({ src, index }: { src: string; index: number }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false); const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0); const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = video.current; if (!node) return;
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting || entries[0].intersectionRatio < .5) node.pause(); }, { threshold: [.5] });
    observer.observe(node); const hide = () => { if (document.hidden) node.pause(); }; document.addEventListener("visibilitychange", hide);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", hide); };
  }, []);
  async function toggle() { const node = video.current; if (!node || failed) return; if (!node.paused) node.pause(); else { try { await node.play(); } catch { setPlaying(false); } } }
  return <div className={`shop-review-video shop-review-reel ${playing ? "is-playing" : ""}`}>
    <video ref={video} src={src} playsInline preload="metadata" muted={muted} aria-label={`Blogger review ${index + 1}`} onPlay={event => { setPlaying(true); const current = event.currentTarget; current.closest('.shop-review-rail')?.querySelectorAll('video').forEach(other => { if (other !== current) other.pause(); }); }} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setProgress(100); }} onTimeUpdate={event => { const node = event.currentTarget; if (Number.isFinite(node.duration) && node.duration > 0) setProgress(node.currentTime / node.duration * 100); }} onError={() => { setFailed(true); setPlaying(false); }}/>
    <button type="button" className="shop-reel-play" disabled={failed} onClick={() => void toggle()} aria-label={`${playing ? "Pause" : "Play"} blogger review ${index + 1}`}><span className="shop-reel-play-icon"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="currentColor">{playing ? <path d="M7 5h4v14H7zm6 0h4v14h-4z"/> : <path d="m9 5 11 7-11 7z"/>}</svg></span></button>
    <button type="button" className="shop-reel-sound" onClick={() => setMuted(!muted)} aria-label={`${muted ? "Unmute" : "Mute"} blogger review ${index + 1}`} aria-pressed={muted}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{muted ? <path d="m16 9 5 6m0-6-5 6"/> : <><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></>}</svg></button>
    <input className="shop-reel-progress" type="range" min="0" max="100" step=".1" value={progress} disabled={failed} aria-label={`Seek blogger review ${index + 1}`} style={{ background: `linear-gradient(to right,#FAEAB1 ${progress}%,#ffffff55 ${progress}%)` }} onChange={event => { const node = video.current; if (node && Number.isFinite(node.duration) && node.duration > 0) { const value = Number(event.target.value); node.currentTime = node.duration * value / 100; setProgress(value); } }}/>
    {failed && <p className="shop-reel-error" role="status">Video unavailable</p>}
  </div>;
}
