"use client";
import { useShopNavigation } from "./ShopNavigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartProvider";
import type { ShopSettings } from "@/lib/storefront/config";
import { ShopIcon } from "./ShopIcon";
import { useEffect, useState } from "react";

export function ShopHeader({ announcement, announcements = [], announcementInterval = 5, announcementBackground = "#3F3A60", announcementTextColor = "#FAEAB1" }: { announcement: string; announcements?: string[]; announcementInterval?: number; announcementBackground?: string; announcementTextColor?: string; menCategory?: string; womenCategory?: string }) {
  const navigate = useShopNavigation();
  const { lines, favorites, openBag } = useCart(); const [open, setOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const messages = announcements.length ? announcements : announcement ? [announcement] : [];
  const messageKey = messages.join("\n");
  useEffect(() => { setAnnouncementIndex(0); }, [messageKey]);
  useEffect(() => {
    if (messages.length < 2) return;
    const timer = window.setInterval(() => setAnnouncementIndex(index => (index + 1) % messages.length), announcementInterval * 1000);
    return () => window.clearInterval(timer);
  }, [announcementInterval, messageKey, messages.length]);
  const links = [["/", "Home"], ["/products?audience=men", "For Men"], ["/products?audience=women", "For Women"], ["/samples", "Samples"], ["/contact", "Contact"], ["/policies", "Policies"]];
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
  return <><div className="shop-header-stack">{messages.length > 0 && <div className="shop-announcement" style={{ backgroundColor: announcementBackground }}><div className="shop-announcement-message" style={{ backgroundColor: announcementBackground }}><p style={{ color: announcementTextColor }} key={announcementIndex}>{messages[announcementIndex % messages.length]}</p></div></div>}<header className="shop-header">
    <Link href="/" className="shop-wordmark" aria-label="Auraic home"><Image src="/auraic-logo.png" alt="Auraic" width={220} height={96} priority /></Link>
    <div className="shop-header-actions"><button type="button" className="shop-search-button" onClick={() => setSearchOpen(true)} aria-label="Search fragrances"><ShopIcon name="search"/></button><button type="button" className="shop-header-bag" onClick={openBag} aria-label={`Shopping bag, ${count} items`}><ShopIcon name="bag"/><b>{count}</b></button><button type="button" className="shop-menu-button" aria-label="Open menu" aria-expanded={open} aria-controls="shop-drawer" onClick={() => setOpen(true)}><ShopIcon name="menu"/></button></div>
  </header></div>{open && <div className="shop-drawer-layer"><button className="shop-drawer-backdrop" onClick={() => setOpen(false)} aria-label="Close menu"/><section id="shop-drawer" className="shop-drawer" role="dialog" aria-modal="true" aria-label="Store menu"><header><Image src="/auraic-logo.png" alt="Auraic" width={150} height={80}/><button autoFocus onClick={() => setOpen(false)} aria-label="Close menu"><ShopIcon name="close"/></button></header><nav>{links.map(([url,label]) => <Link key={url} href={url} onClick={() => setOpen(false)}>{label}<ShopIcon name="arrow"/></Link>)}</nav><footer><Link onClick={() => setOpen(false)} href="/favorites"><ShopIcon name="heart"/> Wishlist ({favorites.length})</Link><Link onClick={() => setOpen(false)} href="/cart"><ShopIcon name="bag"/> Bag ({count})</Link></footer></section></div>}{searchOpen && <div className="shop-drawer-layer"><button className="shop-drawer-backdrop" onClick={() => setSearchOpen(false)} aria-label="Close search"/><section id="shop-search-dialog" className="shop-search-dialog" role="dialog" aria-modal="true" aria-label="Search fragrances"><header><h2>Find your fragrance</h2><button onClick={() => setSearchOpen(false)} aria-label="Close search"><ShopIcon name="close"/></button></header><form action="/products" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); setSearchOpen(false); navigate(`/products?q=${encodeURIComponent(String(data.get("q") || ""))}`); }}><input autoFocus name="q" maxLength={200} placeholder="Search Auraic" aria-label="Fragrance name"/><button type="submit" className="shop-button">Search <ShopIcon name="search"/></button></form></section></div>}</>;
}
export function ShopFooter({ settings }: { settings: ShopSettings }) {
  return <><section className="shop-benefits"><div><ShopIcon name="perfume"/> <b>A fragrance for every feeling</b><span>Find your scent. Choose your size.</span></div><div><ShopIcon name="truck"/> <b>Delivered to your door</b><span>Delivery as described in our shipping policy</span></div><div><ShopIcon name="cash"/> <b>Cash on delivery</b><span>Pay when your order arrives</span></div></section>
    <footer className="shop-footer"><div className="shop-footer-brand"><Image src="/auraic-logo.png" width={320} height={200} alt="Auraic" className="shop-footer-logo" /><p>Designed to be felt, not just smelled.</p></div><nav className="shop-footer-quick" aria-label="Quick links"><h3>Quick links</h3><Link href="/">Home</Link><Link href="/products?audience=men">Men</Link><Link href="/products?audience=women">Women</Link><Link href="/products">All fragrances</Link><Link href="/samples">Samples</Link><Link href="/contact">Contact</Link></nav><nav className="shop-footer-company" aria-label="Company"><h3>Company</h3><Link href="/shipping">Shipping Policy</Link><Link href="/returns">Returns Policy</Link><Link href="/contact">Contact</Link><Link href="/login">Admin login</Link></nav><small>© Auraic {new Date().getFullYear()}</small></footer>
    {settings.whatsapp && <a className="shop-whatsapp" aria-label="Chat on WhatsApp" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer"><ShopIcon name="whatsapp"/></a>}
  </>;
}
