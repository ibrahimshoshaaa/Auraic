"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";

const lineSchema = z.object({ variantId: z.string().max(100), productId: z.string().max(100), name: z.string().max(250), size: z.string().max(250), image: z.string().max(2000), quantity: z.number().int().min(1).max(20) });
export type CartLine = z.infer<typeof lineSchema>;
const Cart = createContext<{ lines: CartLine[]; ready: boolean; add: (line: CartLine) => void; update: (id: string, quantity: number) => void; clear: () => void } | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const saved = z.array(lineSchema).max(20).parse(JSON.parse(localStorage.getItem("auraic-cart") || "[]")); setLines(saved); } catch { setLines([]); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem("auraic-cart", JSON.stringify(lines)); }, [lines, ready]);
  const add = (line: CartLine) => setLines(current => {
    const found = current.find(item => item.variantId === line.variantId);
    return found ? current.map(item => item.variantId === line.variantId ? { ...item, quantity: Math.min(20, item.quantity + line.quantity) } : item)
      : current.length < 20 ? [...current, line] : current;
  });
  return <Cart.Provider value={{ lines, ready, add, update: (id, quantity) => setLines(current => quantity <= 0 ? current.filter(item => item.variantId !== id) : current.map(item => item.variantId === id ? { ...item, quantity: Math.min(20, quantity) } : item)), clear: () => setLines([]) }}>{children}</Cart.Provider>;
}
export function useCart() { const value = useContext(Cart); if (!value) throw new Error("CartProvider required"); return value; }
