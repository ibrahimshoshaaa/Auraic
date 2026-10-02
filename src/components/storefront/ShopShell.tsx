"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import type { ShopSettings } from "@/lib/storefront/config";
import { ShopIcon } from "./ShopIcon";
import { useEffect, useState } from "react";

export function ShopHeader({ announcement, menCategory, womenCategory }: { announcement: string; menCategory: string; womenCategory: string }) {
  const { lines, favorites, ready } = useCart(); const [open, setOpen] = useState(false); const pathname = usePathname();
  const links = [["/", "الرئيسية"], [`/products?category=${encodeURIComponent(menCategory)}`, "رجالي"], [`/products?category=${encodeURIComponent(womenCategory)}`, "حريمي"], ["/products", "كل العطور"], ["/contact", "تواصل معنا"]];
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow; document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Tab") {
        const elements = document.querySelectorAll<HTMLElement>("#shop-drawer a, #shop-drawer button"); const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow = before; document.removeEventListener("keydown", close); document.querySelector<HTMLButtonElement>(".shop-menu-button")?.focus(); };
  }, [open]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return <><div className="shop-header-stack">{announcement && <div className="shop-announcement"><span>✦</span><p>{announcement}</p><span>✦</span></div>}<header className="shop-header">
    <div className="shop-header-start"><button className="shop-menu-button" aria-label="فتح القائمة" aria-expanded={open} aria-controls="shop-drawer" onClick={() => setOpen(true)}><ShopIcon name="menu"/></button><nav className="shop-desktop-nav">{links.map(([url, label]) => <Link key={url} href={url} aria-current={pathname === url ? "page" : undefined}>{label}</Link>)}</nav></div>
    <Link href="/" className="shop-wordmark" aria-label="Auraic الرئيسية"><Image src="/auraic-logo.jpg" alt="Auraic" width={180} height={80} priority /></Link>
    <div className="shop-header-actions"><Link href="/products#shop-search" aria-label="بحث عن عطر"><ShopIcon name="search"/></Link><Link href="/favorites" aria-label={`المفضلة، ${favorites.length} عطر`}><ShopIcon name="heart"/>{ready && favorites.length > 0 && <b>{favorites.length}</b>}</Link><Link href="/cart" aria-label={`السلة، ${count} قطعة`}><ShopIcon name="bag"/>{ready && count > 0 && <b>{count}</b>}</Link></div>
  </header></div>{open && <div className="shop-drawer-layer"><button className="shop-drawer-backdrop" onClick={() => setOpen(false)} aria-label="إغلاق القائمة"/><section id="shop-drawer" className="shop-drawer" role="dialog" aria-modal="true" aria-label="قائمة المتجر"><header><Image src="/auraic-logo.jpg" alt="Auraic" width={150} height={80}/><button autoFocus onClick={() => setOpen(false)} aria-label="إغلاق القائمة"><ShopIcon name="close"/></button></header><nav>{links.map(([url,label]) => <Link key={url} href={url} onClick={() => setOpen(false)}>{label}<ShopIcon name="arrow"/></Link>)}</nav><footer><Link onClick={() => setOpen(false)} href="/favorites">المفضلة</Link><Link onClick={() => setOpen(false)} href="/cart">السلة</Link></footer></section></div>}</>;
}
export function ShopFooter({ settings }: { settings: ShopSettings }) {
  return <><section className="shop-benefits"><div>◇ <b>عطور تعبر عنك</b><span>اختر عطرك وحجمك المفضل</span></div><div>↗ <b>إلى باب بيتك</b><span>الشحن حسب سياسة المتجر</span></div><div>♧ <b>الدفع عند الاستلام</b><span>ادفع عند وصول طلبك</span></div></section>
    <footer className="shop-footer"><div><Image src="/auraic-logo.jpg" width={320} height={200} alt="Auraic" className="shop-footer-logo" /><p>عطر يُشعَر به، قبل أن يُشم.</p></div><div><h3>اكتشف Auraic</h3><Link href="/products">كل العطور</Link><Link href="/contact">تواصل معنا</Link></div><div><h3>معلومات تهمك</h3><Link href="/shipping">الشحن والتوصيل</Link><Link href="/returns">سياسة الاستبدال والإرجاع</Link><Link href="/login">دخول الإدارة</Link></div><small>© {new Date().getFullYear()} Auraic. جميع الحقوق محفوظة.</small></footer>
    {settings.whatsapp && <a className="shop-whatsapp" aria-label="تواصل عبر واتساب" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer">واتساب ↗</a>}
  </>;
}
