"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopProduct } from "@/services/storefront/catalog";
import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/storefront/pricing";

export function SampleSelector({ products, enabled }: { products: ShopProduct[]; enabled: boolean }) {
  const router = useRouter(); const { addMany, ready, openBag } = useCart();
  const [count, setCount] = useState(3); const [selected, setSelected] = useState(["", "", "", "", ""]); const [error, setError] = useState("");
  const options = products.flatMap(product => product.variants.map(variant => ({ product, variant })));
  const choices = selected.slice(0, count).map(id => options.find(option => option.variant.id === id));
  const complete = choices.every(Boolean); const total = choices.reduce((sum, option) => sum + (option ? Math.round(option.variant.price * 100) : 0), 0);
  const photos = choices.filter(option => option !== undefined);
  const canBuy = complete && ready && enabled && options.length > 0;
  function buy(checkout: boolean) {
    if (!canBuy) return;
    const items = choices.flatMap(option => option ? [{ variantId: option.variant.id, productId: option.product.id, name: option.product.name, size: option.variant.title, image: option.product.images[0] || "/auraic-bottle.svg", quantity: 1 }] : []);
    if (!addMany(items)) { setError("Your bag has reached its limit. Update your bag before adding these samples."); return; }
    setError(""); if (checkout) router.push("/checkout"); else openBag();
  }
  return <main className="shop-samples-page"><nav className="shop-policy-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Samples</span></nav><div className="shop-samples-layout"><section className="shop-samples-art" aria-label="Sample preview">{photos.length ? photos.map((option, index) => <Image key={index} src={option.product.images[0] || "/auraic-bottle.svg"} width={240} height={300} alt={option.product.name} unoptimized/>) : products.slice(0, 3).map(product => <Image key={product.id} src={product.images[0] || "/auraic-bottle.svg"} width={240} height={300} alt={product.name} unoptimized/>)}{!products.length && <span>YOUR NEXT SCENT<br/>STARTS SMALL.</span>}</section><section className="shop-samples-copy"><p className="shop-eyebrow">TRY. DISCOVER. FEEL.</p><h1>Find your Auraic</h1><p className="shop-samples-intro">Try before you choose. Select your samples and experience the fragrance at home.</p>{!products.length ? <div className="shop-samples-empty"><h2>Samples are coming soon</h2><p>Explore our full collection while we prepare your discovery experience.</p><Link className="shop-button" href="/products">EXPLORE FRAGRANCES →</Link></div> : <><fieldset className="shop-sample-count"><legend>HOW MANY SAMPLES?</legend>{[3, 5].map(number => <button key={number} type="button" aria-pressed={count === number} onClick={() => { setCount(number); setError(""); }}>{number}</button>)}</fieldset>{Array.from({ length: count }, (_, index) => <label className="shop-sample-select" key={index}>SAMPLE {index + 1}<select value={selected[index]} onChange={event => { setSelected(current => current.map((value, i) => i === index ? event.target.value : value)); setError(""); }}><option value="">Find your Auraic…</option>{options.map(option => <option key={option.variant.id} value={option.variant.id}>{option.product.name} · {option.variant.title} · {formatMoney(option.variant.price)}</option>)}</select>{choices[index] && <p>{choices[index]!.product.description}</p>}</label>)}<p className="shop-samples-total" aria-live="polite">{complete ? formatMoney(total / 100) : "Choose your samples to see the total"}</p>{!enabled && <p role="status">Orders are currently paused.</p>}{error && <p role="alert" className="shop-error">{error}</p>}<button type="button" className="shop-button shop-samples-add" disabled={!canBuy} onClick={() => buy(false)}>ADD TO BAG →</button><button type="button" className="shop-button shop-samples-buy" disabled={!canBuy} onClick={() => buy(true)}>BUY IT NOW →</button></>}</section></div></main>;
}
