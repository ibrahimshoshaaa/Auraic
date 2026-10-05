import { hasOffer } from "@/lib/storefront/collections";
import Link from "next/link";
import { ReviewSections } from "@/components/storefront/ReviewSections";
import { ShopHero } from "@/components/storefront/ShopHero";
import { FeaturedCollection } from "@/components/storefront/FeaturedCollection";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Auraic | Discover your fragrance", description: "Discover Auraic fragrances. Shop for men and women, choose your size and pay on delivery." };
export default async function HomePage() {
  const shop = await getPublicShop(); if (!shop) return null;
  const products = await getPublicProducts(shop.id);
  return <main><ShopHero settings={shop.settings}/><FeaturedCollection products={products.filter(hasOffer)} settings={shop.settings} title={shop.settings.offersTitle} eyebrow="YOUR NEXT SCENT, FOR LESS" href="/products?collection=offers" id="offers"/><FeaturedCollection products={products.filter(p => p.featured)} settings={shop.settings} href="/products?collection=bestsellers" id="bestsellers"/><FeaturedCollection products={products} settings={shop.settings} title={shop.settings.allProductsTitle} eyebrow="DISCOVER THE COLLECTION" id="products"/><ReviewSections settings={shop.settings}/><section className="shop-story"><span className="shop-eyebrow">{shop.settings.storyEyebrow}</span><h2 style={{ whiteSpace: "pre-line" }}>{shop.settings.storyTitle}</h2><p>{shop.settings.storyDescription}</p><Link className="shop-button gold" href="/products">{shop.settings.storyButtonLabel} →</Link></section></main>;
}
