import Link from "next/link";
import { ShopHero } from "@/components/storefront/ShopHero";
import { ProductCard } from "@/components/storefront/Catalog";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Auraic | عطرك… أثر لا يُنسى", description: "اكتشف مجموعة عطور Auraic، واختر عطرك وحجمك المفضل. تسوق أونلاين والدفع عند الاستلام." };
export default async function HomePage() {
  const shop = await getPublicShop(); if (!shop) return null;
  const products = await getPublicProducts(shop.id);
  const categories = [...new Set(products.map(product => product.category))];
  return <main><ShopHero settings={shop.settings} /><div className="shop-brand-strip">AURAIC <span>✦</span> A SCENT THAT STAYS <span>✦</span> DESIGNED TO BE FELT</div>
    <section className="shop-section"><div className="shop-section-heading"><div><p className="shop-eyebrow">FIND YOUR AURA</p><h2>لكل إحساس… عطر</h2></div><Link href="/products">اكتشف المجموعة ←</Link></div><div className="shop-category-grid">{categories.map((category, index) => <Link href={`/products?category=${encodeURIComponent(category)}`} key={category}><span>{String(index + 1).padStart(2, "0")}</span><h3>{category}</h3><p>اكتشف عطرك المفضل</p><b>↗</b></Link>)}</div>{!categories.length && <p className="shop-empty">مجموعتنا الجديدة بتتجهز. تابعنا لاكتشاف أول العطور.</p>}</section>
    <section className="shop-section shop-featured"><div className="shop-section-heading"><div><p className="shop-eyebrow">THE COLLECTION</p><h2>اكتشف عطور Auraic</h2></div><Link href="/products">عرض الكل ←</Link></div><div className="shop-product-grid">{products.slice(0, 8).map(product => <ProductCard key={product.id} product={product} />)}</div></section>
    <section className="shop-story"><span className="shop-eyebrow">BEYOND A FRAGRANCE</span><h2>مش مجرد عطر.<br/>ده إحساس يفضل معاك.</h2><p>Auraic مساحة لاكتشاف الرائحة اللي تشبهك. اختار عطرك، وسيب أثرًا يحكي عنك.</p><Link className="shop-button gold" href="/products">ابدأ حكايتك ←</Link></section>
  </main>;
}
