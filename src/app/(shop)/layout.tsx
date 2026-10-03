import { BagDrawer } from "@/components/storefront/Bag";
import { getPublicProducts } from "@/services/storefront/catalog";
import { ShopNavigation } from "@/components/storefront/ShopNavigation";
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
  return <div className="auraic-shop" lang="en" dir="ltr"><CartProvider><ShopNavigation><ShopHeader announcement={settings.announcement} menCategory={settings.menCollectionCategory} womenCategory={settings.womenCollectionCategory} />{!shop ? <main className="shop-coming-soon"><p className="shop-eyebrow">AURAIC</p><h1>The Auraic experience is coming soon</h1><p>We are preparing our store. See you soon.</p></main> : children}<ShopFooter settings={settings} /><BagDrawer products={shop ? await getPublicProducts(shop.id, "all") : []} settings={settings}/></ShopNavigation></CartProvider></div>;
}
