import Link from "next/link";
import { ShopHero } from "@/components/storefront/ShopHero";
import { FeaturedCollection } from "@/components/storefront/FeaturedCollection";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Auraic | Discover your fragrance", description: "Discover Auraic fragrances. Shop for men and women, choose your size and pay on delivery." };
export default async function HomePage() {
  const shop = await getPublicShop(); if (!shop) return null;
  const products = await getPublicProducts(shop.id);
  return <main><ShopHero settings={shop.settings}/><FeaturedCollection products={products.slice(0, 8)}/><section className="shop-story"><span className="shop-eyebrow">DESIGNED TO BE FELT</span><h2>More than a fragrance.<br/>A feeling that stays.</h2><p>Find the fragrance that feels like you. Make your presence unforgettable.</p><Link className="shop-button gold" href="/products">Find your Auraic →</Link></section></main>;
}
