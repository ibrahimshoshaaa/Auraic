export type ShopEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";
export function trackShopEvent(event: ShopEvent, data: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("auraic:track", { detail: { event, data } }));
}
