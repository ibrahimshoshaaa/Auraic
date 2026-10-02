import type { SVGProps } from "react";
export function ShopIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: "bag" | "heart" | "search" | "menu" | "close" | "arrow" }) {
  const paths = { bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>, heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>, search: <><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>, menu: <path d="M3 6h18M3 12h18M3 18h18"/>, close: <path d="m6 6 12 12M6 18 18 6"/>, arrow: <path d="M20 12H4m6-6-6 6 6 6"/> };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
