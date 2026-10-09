import { NextResponse } from "next/server";
import { getPublicShop } from "@/services/storefront/catalog";
import { getSetting } from "@/lib/settings";

export async function GET() {
  const shop = await getPublicShop();
  if (!shop) return NextResponse.json({ error: "Unavailable" }, { status: 404 });
  const keys = ["paymentInstaPayEnabled", "paymentWalletEnabled", "paymentInstaPayAddress", "paymentWalletNumber", "paymentDepositAmount", "paymentInstaPayAccountName", "paymentWalletAccountName"] as const;
  const [instapay, wallet, address, number, deposit, accountName, walletAccountName] = await Promise.all(keys.map(key => getSetting(shop.id, key)));
  return NextResponse.json({ instapay: instapay === "true" && !!address, wallet: wallet === "true" && !!number, address: instapay === "true" ? address : "", accountName: instapay === "true" ? accountName : "", number: wallet === "true" ? number : "", walletAccountName: wallet === "true" ? walletAccountName : "", depositAmount: Number(deposit) });
}
