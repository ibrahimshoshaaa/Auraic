"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { z } from "zod";

const lineSchema = z.object({ variantId: z.string().max(100), productId: z.string().max(100), name: z.string().max(250), size: z.string().max(250), image: z.string().max(2000), quantity: z.number().int().min(1).max(20) });
export type CartLine = z.infer<typeof lineSchema>;
const Cart = createContext<{ note: string; setNote: (value: string) => void; bagOpen: boolean; openBag: () => void; closeBag: () => void; lines: CartLine[]; ready: boolean; favorites: string[]; toggleFavorite: (id: string) => void; add: (line: CartLine) => void; update: (id: string, quantity: number) => void; clear: () => void } | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [note, setNote] = useState("");
  const [bagOpen, setBagOpen] = useState(false);
  const openBag = useCallback(() => setBagOpen(true), []);
  const closeBag = useCallback(() => setBagOpen(false), []);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const saved = z.array(lineSchema).max(20).parse(JSON.parse(localStorage.getItem("auraic-cart") || "[]")); setLines(saved); } catch { setLines([]); }
    try { setFavorites(z.array(z.string().max(100)).max(200).parse(JSON.parse(localStorage.getItem("auraic-favorites") || "[]"))); } catch { setFavorites([]); }
    try { setNote((localStorage.getItem("auraic-bag-note") || "").slice(0, 500)); } catch { /* Keep note in memory. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem("auraic-cart", JSON.stringify(lines)); } catch { /* Storage may be unavailable. */ } } }, [lines, ready]);
  useEffect(() => { if (ready) { try { localStorage.setItem("auraic-favorites", JSON.stringify(favorites)); } catch { /* Keep favorites in memory. */ } } }, [favorites, ready]);
  useEffect(() => { if (ready) { try { localStorage.setItem("auraic-bag-note", note); } catch { /* Keep note in memory. */ } } }, [note, ready]);
  const add = (line: CartLine) => setLines(current => {
    const found = current.find(item => item.variantId === line.variantId);
    return found ? current.map(item => item.variantId === line.variantId ? { ...item, quantity: Math.min(20, item.quantity + line.quantity) } : item)
      : current.length < 20 ? [...current, line] : current;
  });
  return <Cart.Provider value={{ note, setNote: value => setNote(value.slice(0, 500)), bagOpen, openBag, closeBag, lines, ready, favorites, toggleFavorite: id => setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 200 ? [...current, id] : current), add, update: (id, quantity) => setLines(current => quantity <= 0 ? current.filter(item => item.variantId !== id) : current.map(item => item.variantId === id ? { ...item, quantity: Math.min(20, quantity) } : item)), clear: () => { setLines([]); setNote(""); } }}>{children}</Cart.Provider>;
}
export function useCart() { const value = useContext(Cart); if (!value) throw new Error("CartProvider required"); return value; }
