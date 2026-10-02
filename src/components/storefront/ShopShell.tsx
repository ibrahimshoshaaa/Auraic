"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";
import type { ShopSettings } from "@/lib/storefront/config";
import { useState } from "react";

export function ShopHeader({ announcement }: { announcement: string }) {
  const { lines, favorites } = useCart(); const [open, setOpen] = useState(false); const pathname = usePathname();
  return <><div className="shop-announcement">{announcement}</div><header className="shop-header">
    <button className="shop-menu-button" aria-label="فتح القائمة" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
    <Link href="/" className="shop-wordmark" aria-label="Auraic الرئيسية">Auraic<span>DESIGNED TO BE FELT</span></Link>
    <nav className={open ? "shop-nav open" : "shop-nav"}>{[["/", "الرئيسية"], ["/products", "العطور"], ["/favorites", "المفضلة"], ["/contact", "تواصل معنا"]].map(([url, label]) => <Link onClick={() => setOpen(false)} key={url} href={url} aria-current={pathname === url ? "page" : undefined}>{label}</Link>)}</nav>
    <Link href="/favorites" className="shop-favorites-link" aria-label={`المفضلة، ${favorites.length} عطر`}>♡ <b>{favorites.length}</b></Link>
    <Link href="/cart" className="shop-cart-link" aria-label={`حقيبة التسوق، ${lines.reduce((sum, line) => sum + line.quantity, 0)} قطعة`}><span>الحقيبة</span> ♧ <b>{lines.reduce((sum, line) => sum + line.quantity, 0)}</b></Link>
  </header></>;
}
export function ShopFooter({ settings }: { settings: ShopSettings }) {
  return <><section className="shop-benefits"><div>◇ <b>عطور تعبر عنك</b><span>اختر عطرك وحجمك المفضل</span></div><div>↗ <b>إلى باب بيتك</b><span>الشحن حسب سياسة المتجر</span></div><div>♧ <b>الدفع عند الاستلام</b><span>ادفع عند وصول طلبك</span></div></section>
    <footer className="shop-footer"><div><Image src="/auraic-logo.jpg" width={320} height={200} alt="Auraic" className="shop-footer-logo" /><p>عطر يُشعَر به، قبل أن يُشم.</p></div><div><h3>اكتشف Auraic</h3><Link href="/products">كل العطور</Link><Link href="/contact">تواصل معنا</Link></div><div><h3>معلومات تهمك</h3><Link href="/shipping">الشحن والتوصيل</Link><Link href="/returns">سياسة الاستبدال والإرجاع</Link><Link href="/login">دخول الإدارة</Link></div><small>© {new Date().getFullYear()} Auraic. جميع الحقوق محفوظة.</small></footer>
    {settings.whatsapp && <a className="shop-whatsapp" aria-label="تواصل عبر واتساب" href={`https://wa.me/${settings.whatsapp}`} target="_blank" rel="noopener noreferrer">واتساب ↗</a>}
  </>;
}
