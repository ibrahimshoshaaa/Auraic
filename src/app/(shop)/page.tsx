import Link from "next/link";
import Image from "next/image";
import { ShopHero } from "@/components/storefront/ShopHero";
import { ProductCard } from "@/components/storefront/Catalog";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Auraic | عطرك… أثر لا يُنسى", description: "اكتشف مجموعة عطور Auraic، واختر عطرك وحجمك المفضل. تسوق أونلاين والدفع عند الاستلام." };
export default async function HomePage() {
  const shop = await getPublicShop(); if (!shop) return null;
  const products = await getPublicProducts(shop.id);
  const collections = [{ label: "عطور رجالي", hint: "حضور يترك أثرًا", category: shop.settings.menCollectionCategory, image: shop.settings.menCollectionImage }, { label: "عطور حريمي", hint: "رائحة تحكي عنكِ", category: shop.settings.womenCollectionCategory, image: shop.settings.womenCollectionImage }];
  return <main><ShopHero settings={shop.settings} />
    <section className="shop-section shop-collections"><header className="shop-centered-heading"><p className="shop-eyebrow">EXPLORE AURAIC</p><h2>اكتشف مجموعتنا</h2><p>عطرك… بداية حكايتك</p></header><div className="shop-collection-grid">{collections.map((collection, index) => <Link className={`shop-collection-card collection-${index}`} href={`/products?category=${encodeURIComponent(collection.category)}`} key={collection.label}><Image src={collection.image || "/auraic-bottle.svg"} alt={collection.label} fill unoptimized={!!collection.image} sizes="(max-width: 760px) 100vw, 50vw" /><div className="shop-collection-copy"><p>{collection.hint}</p><h3>{collection.label}</h3><span>اكتشف المجموعة ←</span></div></Link>)}</div></section>
    <section className="shop-section shop-featured" id="products"><div className="shop-section-heading"><div><p className="shop-eyebrow">THE COLLECTION</p><h2>أحدث عطور Auraic</h2></div><Link href="/products">عرض الكل ←</Link></div><div className="shop-product-grid">{products.slice(0, 8).map(product => <ProductCard key={product.id} product={product} />)}</div></section>
    <section className="shop-story"><span className="shop-eyebrow">BEYOND A FRAGRANCE</span><h2>مش مجرد عطر.<br/>ده إحساس يفضل معاك.</h2><p>Auraic مساحة لاكتشاف الرائحة اللي تشبهك. اختار عطرك، وسيب أثرًا يحكي عنك.</p><Link className="shop-button gold" href="/products">ابدأ حكايتك ←</Link></section>
  </main>;
}
