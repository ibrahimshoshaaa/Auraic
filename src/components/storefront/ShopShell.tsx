"use client";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import type { ShopSettings } from "@/lib/storefront/config";
import { ShopIcon } from "./ShopIcon";
import { useEffect, useState } from "react";

export function ShopHeader({ announcement, menCategory, womenCategory }: { announcement: string; menCategory: string; womenCategory: string }) {
  const { lines, favorites } = useCart(); const [open, setOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false); const [announcementPaused, setAnnouncementPaused] = useState(false);
  const links = [["/", "Home"], [`/products?category=${encodeURIComponent(menCategory)}`, "Shop for men"], [`/products?category=${encodeURIComponent(womenCategory)}`, "Shop for women"], ["/products", "All fragrances"], ["/favorites", "Wishlist"], ["/contact", "Contact"]];
  useEffect(() => {
    if (!open && !searchOpen) return;
    const before = document.body.style.overflow; document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); setSearchOpen(false); }
      if (event.key === "Tab") {
        const elements = document.querySelectorAll<HTMLElement>(open ? "#shop-drawer a, #shop-drawer button" : "#shop-search-dialog input, #shop-search-dialog button"); const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow = before; document.removeEventListener("keydown", close); document.querySelector<HTMLButtonElement>(open ? ".shop-menu-button" : ".shop-search-button")?.focus(); };
  }, [open, searchOpen]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <><div className="shop-header-stack">{announcement && <div className={`shop-announcement ${announcementPaused ? "paused" : ""}`}><div className="shop-announcement-message"><p>{announcement}</p></div><button type="button" onClick={() => setAnnouncementPaused(!announcementPaused)} aria-label={announcementPaused ? "Resume announcement" : "Pause announcement"} aria-pressed={announcementPaused}>{announcementPaused ? "▶" : "Ⅱ"}</button></div>}<header className="shop-header">
    <Link href="/" className="shop-wordmark" aria-label="Auraic home"><Image src="/auraic-logo.jpg" alt="Auraic" width={220} height={96} priority /></Link>
    <div className="shop-header-actions"><button type="button" className="shop-search-button" onClick={() => setSearchOpen(true)} aria-label="Search fragrances"><ShopIcon name="search"/></button><Link href="/cart" aria-label={`Shopping bag, ${count} items`}><ShopIcon name="bag"/><b>{count}</b></Link><button type="button" className="shop-menu-button" aria-label="Open menu" aria-expanded={open} aria-controls="shop-drawer" onClick={() => setOpen(true)}><ShopIcon name="menu"/></button></div>
  </header></div>{open && <div className="shop-drawer-layer"><button className="shop-drawer-backdrop" onClick={() => setOpen(false)} aria-label="Close menu"/><section id="shop-drawer" className="shop-drawer" role="dialog" aria-modal="true" aria-label="Store menu"><header><Image src="/auraic-logo.jpg" alt="Auraic" width={150} height={80}/><button autoFocus onClick={() => setOpen(false)} aria-label="Close menu"><ShopIcon name="close"/></button></header><nav>{links.map(([url,label]) => <Link key={url} href={url} onClick={() => setOpen(false)}>{label}<ShopIcon name="arrow"/></Link>)}</nav><footer><Link onClick={() => setOpen(false)} href="/favorites"><ShopIcon name="heart"/> Wishlist ({favorites.length})</Link><Link onClick={() => setOpen(false)} href="/cart"><ShopIcon name="bag"/> Bag ({count})</Link></footer></section></div>}{searchOpen && <div className="shop-drawer-layer"><button className="shop-drawer-backdrop" onClick={() => setSearchOpen(false)} aria-label="Close search"/><section id="shop-search-dialog" className="shop-search-dialog" role="dialog" aria-modal="true" aria-label="Search fragrances"><header><h2>Find your fragrance</h2><button onClick={() => setSearchOpen(false)} aria-label="Close search"><ShopIcon name="close"/></button></header><form action="/products" onSubmit={() => setSearchOpen(false)}><input autoFocus name="q" maxLength={200} placeholder="Search Auraic" aria-label="Fragrance name"/><button type="submit" className="shop-button">Search <ShopIcon name="search"/></button></form></section></div>}</>;
}
export function ShopFooter({ settings }: { settings: ShopSettings }) {
  return <><section className="shop-benefits"><div>◇ <b>A fragrance for every feeling</b><span>Find your scent. Choose your size.</span></div><div>↗ <b>Delivered to your door</b><span>Delivery as described in our shipping policy</span></div><div>♧ <b>Cash on delivery</b><span>Pay when your order arrives</span></div></section>
    <footer className="shop-footer"><div><Image src="/auraic-logo.jpg" width={320} height={200} alt="Auraic" className="shop-footer-logo" /><p>Designed to be felt, not just smelled.</p></div><div><h3>Discover Auraic</h3><Link href="/products">All fragrances</Link><Link href="/contact">Contact us</Link></div><div><h3>Useful information</h3><Link href="/shipping">Shipping & delivery</Link><Link href="/returns">Returns & exchanges</Link><Link href="/login">Admin login</Link></div><small>© {new Date().getFullYear()} Auraic. All rights reserved.</small></footer>
    {settings.whatsapp && <a className="shop-whatsapp" aria-label="Chat on WhatsApp" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>}
  </>;
}
