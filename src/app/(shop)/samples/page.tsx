import { SampleSelector } from "@/components/storefront/SampleSelector";
import { getPublicProducts, getPublicShop } from "@/services/storefront/catalog";
export const metadata = { title: "Samples | Auraic", description: "Try Auraic at home. Choose your fragrance samples before choosing a full bottle." };
export default async function SamplesPage() {
  const shop = await getPublicShop(); if (!shop) return null;
  return <SampleSelector products={await getPublicProducts(shop.id, "samples")} enabled={shop.settings.enabled} coverImage={shop.settings.samplesImage}/>;
}
