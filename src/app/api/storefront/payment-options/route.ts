import { NextResponse } from "next/server";
import { getPublicShop } from "@/services/storefront/catalog";
import { getSetting } from "@/lib/settings";

export async function GET() {
  const shop = await getPublicShop();
  if (!shop) return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  const keys = ["paymentInstaPayEnabled", "paymentWalletEnabled", "paymentInstaPayAddress", "paymentWalletNumber", "paymentDepositPercent"] as const;
  const [instapay, wallet, address, number, percent] = await Promise.all(keys.map(key => getSetting(shop.id, key)));
  return NextResponse.json({ instapay: instapay === "true" && !!address, wallet: wallet === "true" && !!number, address: instapay === "true" ? address : "", number: wallet === "true" ? number : "", depositPercent: Number(percent) });
}
