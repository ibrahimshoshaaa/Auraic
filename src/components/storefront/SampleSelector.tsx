"use client";
import { ShopIcon } from "./ShopIcon";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopProduct } from "@/services/storefront/catalog";
import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/storefront/pricing";

export function SampleSelector({ products, enabled, coverImage = "" }: { products: ShopProduct[]; enabled: boolean; coverImage?: string }) {
  const router = useRouter(); const { addMany, ready, openBag } = useCart();
  const [count, setCount] = useState(3); const [selected, setSelected] = useState(["", "", "", "", ""]); const [error, setError] = useState("");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (activeSlot === null) return;
    const panel = dialog.current;
    const previousOverflow = document.body.style.overflow;
    panel?.showModal();
    document.body.style.overflow = "hidden";
    return () => { panel?.close(); document.body.style.overflow = previousOverflow; };
  }, [activeSlot]);
  const options = products.flatMap(product => product.variants.map(variant => ({ product, variant })));
  const choices = selected.slice(0, count).map(id => options.find(option => option.variant.id === id));
  const complete = choices.every(Boolean); const total = choices.reduce((sum, option) => sum + (option ? Math.round(option.variant.price * 100) : 0), 0);
  const canBuy = complete && ready && enabled && options.length > 0;
  function buy(checkout: boolean) {
    if (!canBuy) return;
    const items = choices.flatMap(option => option ? [{ variantId: option.variant.id, productId: option.product.id, name: option.product.name, size: option.variant.title, image: option.product.images[0] || "/auraic-bottle.svg", quantity: 1 }] : []);
    if (!addMany(items)) { setError("Your bag has reached its limit. Update your bag before adding these samples."); return; }
    setError(""); if (checkout) router.push("/checkout"); else openBag();
  }
  return <main className="shop-samples-page"><nav className="shop-policy-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Samples</span></nav><div className={`shop-samples-layout${coverImage ? "" : " without-cover"}`}>{coverImage && <section className="shop-samples-art" aria-label="Samples cover"><Image src={coverImage} width={1000} height={1200} alt="Auraic fragrance samples" unoptimized priority /></section>}<section className="shop-samples-copy"><p className="shop-eyebrow">TRY. DISCOVER. FEEL.</p><h1>Find your Auraic</h1><p className="shop-samples-intro">Try before you choose. Select your samples and experience the fragrance at home.</p>{!products.length ? <div className="shop-samples-empty"><h2>Samples are coming soon</h2><p>Explore our full collection while we prepare your discovery experience.</p><Link className="shop-button" href="/products">EXPLORE FRAGRANCES →</Link></div> : <><fieldset className="shop-sample-count"><legend>HOW MANY SAMPLES?</legend>{[3, 5].map(number => <button key={number} type="button" aria-pressed={count === number} onClick={() => { setCount(number); setError(""); }}>{number}</button>)}</fieldset>{Array.from({ length: count }, (_, index) => <div className={`shop-sample-select${choices[index] ? " is-selected" : ""}`} key={index}><span id={`sample-label-${index}`}>SAMPLE {index + 1}</span><button type="button" className="shop-sample-trigger" aria-labelledby={`sample-label-${index}`} aria-haspopup="dialog" onClick={() => setActiveSlot(index)}>{choices[index] ? <><Image src={choices[index]!.product.images[0] || "/auraic-bottle.svg"} width={52} height={64} alt="" unoptimized/><span className="shop-sample-name"><strong>{choices[index]!.product.name}</strong><small>{choices[index]!.variant.title}</small></span><b>{formatMoney(choices[index]!.variant.price)}</b></> : <span className="shop-sample-placeholder">Choose a fragrance <small>Tap to explore available samples</small></span>}<ShopIcon name="chevron" className="shop-sample-chevron"/></button>{choices[index] && <p>{choices[index]!.product.description}</p>}</div>)}{activeSlot !== null && <dialog ref={dialog} className="shop-sample-dialog" aria-labelledby="sample-picker-title" onCancel={() => setActiveSlot(null)} onClose={() => setActiveSlot(null)} onClick={event => { if (event.target === event.currentTarget) setActiveSlot(null); }}><div className="shop-sample-dialog-content"><header><div><p className="shop-eyebrow">SAMPLE {activeSlot + 1}</p><h2 id="sample-picker-title">Choose your sample</h2></div><button type="button" aria-label="Close sample picker" onClick={() => setActiveSlot(null)}><ShopIcon name="close"/></button></header><div className="shop-sample-options">{options.map(option => <button type="button" className="shop-sample-option" key={option.variant.id} aria-pressed={selected[activeSlot] === option.variant.id} onClick={() => { setSelected(current => current.map((value, index) => index === activeSlot ? option.variant.id : value)); setError(""); setActiveSlot(null); }}><Image src={option.product.images[0] || "/auraic-bottle.svg"} width={64} height={80} alt="" unoptimized/><span className="shop-sample-name"><strong>{option.product.name}</strong><small>{option.variant.title}</small></span><b>{formatMoney(option.variant.price)}</b><span className="shop-sample-radio" aria-hidden="true">{selected[activeSlot] === option.variant.id ? "✓" : ""}</span></button>)}</div></div></dialog>}<div className="shop-samples-total" aria-live="polite"><span>{complete ? "Your samples total" : `${choices.filter(Boolean).length} of ${count} samples selected`}</span><strong>{complete ? formatMoney(total / 100) : "Choose your samples to see the total"}</strong></div>{!enabled && <p role="status">Orders are currently paused.</p>}{error && <p role="alert" className="shop-error">{error}</p>}<button type="button" className="shop-button shop-samples-add" disabled={!canBuy} onClick={() => buy(false)}>ADD TO BAG →</button><button type="button" className="shop-button shop-samples-buy" disabled={!canBuy} onClick={() => buy(true)}>BUY IT NOW →</button></>}</section></div></main>;
}
