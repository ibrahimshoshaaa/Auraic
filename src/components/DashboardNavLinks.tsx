"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const nav = [
  { label: "الرئيسية", href: "/dashboard", mark: "⌂" },
  { label: "الطلبات", href: "/dashboard/orders", mark: "▤" },
  { label: "المخزون", href: "/dashboard/inventory", mark: "▣" },
  { label: "المنتجات", href: "/dashboard/products", mark: "◇" },
  { label: "المصروفات", href: "/dashboard/expenses", mark: "▣" },
  { label: "المرتجعات", href: "/dashboard/returns", mark: "↶" },
  { label: "الوصفات", href: "/dashboard/recipes", mark: "♧" },
  { label: "الاستهلاك", href: "/dashboard/consumption", mark: "⌁" },
  { label: "التقارير", href: "/dashboard/reports", mark: "▥" },
  { label: "الإعدادات", href: "/dashboard/settings", mark: "⚙" },
  { label: "إدارة المتجر", href: "/dashboard/storefront", mark: "♧" },
  { label: "الكوبونات", href: "/dashboard/coupons", mark: "%" },
  { label: "العملاء", href: "/dashboard/customers", mark: "♙" },
  { label: "المواد الخام", href: "/dashboard/materials", mark: "▦" },
  { label: "الحساب والأمان", href: "/dashboard/account", mark: "⚙" },
  { label: "زيارة المتجر", href: "/", mark: "↗" },
];

export function NavLinks({ compact = false, canCreateOrder = false, canReadCustomers = false, canManageCoupons = false }: { compact?: boolean; canCreateOrder?: boolean; canReadCustomers?: boolean; canManageCoupons?: boolean }) {
  const pathname = usePathname();
  if (compact) {
    const tabs = [nav[0], nav[1],
      canCreateOrder ? { label: "طلب جديد", href: "/dashboard/orders/new", mark: "+" } : nav[3],
      nav[2]];
    return <>
      {tabs.map(({ label, href, mark }) => <Link key={label} href={href}
        aria-current={pathname === href ? "page" : undefined}
        className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] ${pathname === href ? "bg-[#e9e6f8] font-bold text-[#191735]" : "text-[#555766]"}`}>
        <span aria-hidden="true" className={`text-2xl leading-7 ${label === "طلب جديد" ? "flex size-8 items-center justify-center rounded-full bg-[#191735] text-white" : ""}`}>{mark}</span>{label}
      </Link>)}
      <button type="button" onClick={() => {
        const menu = document.querySelector<HTMLDetailsElement>("header details");
        if (menu) { menu.open = !menu.open; if (menu.open) window.scrollTo({ top: 0, behavior: "smooth" }); }
      }} className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] text-[#555766]">
        <span aria-hidden="true" className="text-2xl leading-7">☰</span>المزيد
      </button>
    </>;
  }
  return <GroupedNav key={pathname} pathname={pathname} items={nav.filter(item =>
    (item.href !== "/dashboard/customers" || canReadCustomers) &&
    (item.href !== "/dashboard/coupons" || canManageCoupons))} />;
}

type NavItem = typeof nav[number];
const groups = [
  { label: "المنتجات والمخزون", mark: "▣", paths: ["products", "inventory", "materials", "recipes", "consumption"] },
  { label: "الطلبات والمرتجعات", mark: "▤", paths: ["orders", "returns"] },
  { label: "العملاء والموردون", mark: "♙", paths: ["customers"] },
  { label: "المالية والتقارير", mark: "▥", paths: ["expenses", "reports"] },
  { label: "الإدارة والإعدادات", mark: "⚙", paths: ["storefront", "coupons", "settings", "account"] },
];
function GroupedNav({ pathname, items }: { pathname: string; items: NavItem[] }) {
  const currentGroup = groups.findIndex(group => group.paths.some(path =>
    pathname === `/dashboard/${path}` || pathname.startsWith(`/dashboard/${path}/`)));
  const [expanded, setExpanded] = useState(currentGroup);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const menu = root.current?.closest("details");
    if (!menu) return;
    const reset = () => { if (menu.open) setExpanded(currentGroup); };
    menu.addEventListener("toggle", reset);
    return () => menu.removeEventListener("toggle", reset);
  }, [currentGroup]);
  function destination({ label, href, mark }: NavItem) {
    const active = pathname === href || (href !== "/dashboard" && href !== "/" && pathname.startsWith(`${href}/`));
    return <Link key={href} href={href} aria-current={active ? "page" : undefined}
      onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}
      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe8a1] ${active ? "bg-white/15 font-bold text-white" : "text-slate-300"}`}>
      <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center text-lg text-[#ffe8a1]">{mark}</span>{label}
    </Link>;
  }
  return <nav ref={root} aria-label="التنقل الرئيسي" className="grid gap-1 p-3">
    {destination(nav[0])}
    {groups.map((group, index) => {
      const children = group.paths.flatMap(path => items.filter(item => item.href === `/dashboard/${path}`));
      if (!children.length) return null;
      const open = expanded === index;
      return <div key={group.label}>
        <button type="button" aria-expanded={open} aria-controls={`dashboard-group-${index}`}
          onClick={() => setExpanded(open ? -1 : index)}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffe8a1] ${index === currentGroup ? "text-white" : "text-slate-300"}`}>
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center text-lg text-[#ffe8a1]">{group.mark}</span>
          <span className="flex-1">{group.label}</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <div id={`dashboard-group-${index}`} inert={!open} className={`grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden"><div className="mr-5 grid gap-1 border-r border-white/10 pr-2">{children.map(destination)}</div></div>
        </div>
      </div>;
    })}
    <div className="mt-2 border-t border-white/10 pt-2">{destination(nav.find(item => item.href === "/")!)}</div>
  </nav>;
}
