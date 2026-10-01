import type { ReactNode } from "react";
import { CartProvider } from "@/components/storefront/CartProvider";
import { ShopHeader, ShopFooter } from "@/components/storefront/ShopShell";
import { getPublicShop } from "@/services/storefront/catalog";
import { defaultShopSettings } from "@/lib/storefront/config";
import "./shop.css";
export const dynamic = "force-dynamic";
export default async function ShopLayout({ children }: { children: ReactNode }) {
  const shop = await getPublicShop();
  const settings = shop?.settings || defaultShopSettings;
  return <div className="auraic-shop"><CartProvider><ShopHeader announcement={settings.announcement} />{!shop ? <main className="shop-coming-soon"><p className="shop-eyebrow">AURAIC</p><h1>تجربة Auraic الجديدة… قريبًا</h1><p>نعمل على تجهيز المتجر. نراك قريبًا.</p></main> : children}<ShopFooter settings={settings} /></CartProvider></div>;
}
