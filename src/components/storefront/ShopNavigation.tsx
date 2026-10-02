"use client";
import { createContext, useContext, useEffect, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RouteLoading } from "./RouteLoading";
const NavigationContext = createContext<(url: string) => void>(() => {});
export function useShopNavigation() { return useContext(NavigationContext); }
export function ShopNavigation({ children }: { children: ReactNode }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  useEffect(() => {
    function navigate(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || anchor.target && anchor.target !== "_self") return;
      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin || !["http:", "https:"].includes(next.protocol)) return;
      if (next.pathname === window.location.pathname && next.search === window.location.search) return;
      event.preventDefault();
      if (!pending) startTransition(() => router.push(next.pathname + next.search + next.hash));
    }
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, [router, pending]);
  return <NavigationContext.Provider value={url => startTransition(() => router.push(url))}>{children}{pending && <RouteLoading/>}</NavigationContext.Provider>;
}
