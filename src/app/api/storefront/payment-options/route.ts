import { NextResponse } from "next/server";
import { getPublicShop } from "@/services/storefront/catalog";
import { getSetting } from "@/lib/settings";

export async function GET() {
  const shop = await getPublicShop();
  if (!shop) return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  const keys = ["paymentInstaPayEnabled", "paymentWalletEnabled", "paymentInstaPayAddress", "paymentWalletNumber", "paymentDepositPercent", "paymentInstaPayAccountName"] as const;
  const [instapay, wallet, address, number, percent, accountName] = await Promise.all(keys.map(key => getSetting(shop.id, key)));
  return NextResponse.json({ instapay: instapay === "true" && !!address, wallet: wallet === "true" && !!number, address: instapay === "true" ? address : "", accountName: instapay === "true" ? accountName : "", number: wallet === "true" ? number : "", depositPercent: Number(percent) });
}
