import { z } from "zod";

const image = z.string().url().max(2000).refine(value => value.startsWith("https://"), "استخدم رابط صورة HTTPS");
export const shopSettingsSchema = z.object({
  enabled: z.boolean(),
  announcement: z.string().trim().max(160),
  heroTitle: z.string().trim().min(1, "اكتب عنوان البانر الرئيسي").max(120),
  heroSubtitle: z.string().trim().max(400),
  heroImages: z.array(image).max(8),
  heroMode: z.enum(["images", "video"]).default("images"),
  heroInterval: z.number().int().min(2).max(60).default(6),
  heroVideo: z.union([z.literal(""), image]).default(""),
  menCollectionImage: z.union([z.literal(""), image]).default(""),
  womenCollectionImage: z.union([z.literal(""), image]).default(""),
  menCollectionCategory: z.string().trim().min(1).max(80).default("رجالي"),
  womenCollectionCategory: z.string().trim().min(1).max(80).default("حريمي"),
  menCollectionLabel: z.string().trim().min(1).max(40).default("SHOP FOR MEN"),
  womenCollectionLabel: z.string().trim().min(1).max(40).default("SHOP FOR WOMEN"),
  featuredEyebrow: z.string().trim().max(80).default("CHOSEN BY AURAIC"),
  featuredTitle: z.string().trim().min(1).max(120).default("Best Sellers"),
  offersTitle: z.string().trim().min(1).max(120).default("Offers"),
  allProductsTitle: z.string().trim().min(1).max(120).default("All Products"),
  storyEyebrow: z.string().trim().max(80).default("DESIGNED TO BE FELT"),
  storyTitle: z.string().trim().min(1).max(160).default("More than a fragrance.\nA feeling that stays."),
  storyDescription: z.string().trim().max(600).default("Find the fragrance that feels like you. Make your presence unforgettable."),
  storyButtonLabel: z.string().trim().min(1).max(60).default("Find your Auraic"),
  whatsapp: z.string().transform(value => { const cleaned = value.replace(/[^0-9]/g, ""); return cleaned.startsWith("01") ? `2${cleaned}` : cleaned.startsWith("0020") ? cleaned.slice(2) : cleaned; }).pipe(z.string().regex(/^$|^20\d{10}$/, "اكتب رقم واتساب مصري صحيح")),
  contactEmail: z.string().trim().pipe(z.union([z.literal(""), z.email("راجع بريد التواصل")])),
  shippingRates: z.record(z.string(), z.number().finite().min(0).max(10000)).refine(rates => Object.keys(rates).every(name => (governorates as readonly string[]).includes(name)), "راجع اسم المحافظة").default({}),
  shippingFee: z.number().finite().min(0).max(10000),
  freeShippingFrom: z.number().finite().min(0).max(1000000),
  shippingPolicy: z.string().trim().max(5000),
  returnPolicy: z.string().trim().max(5000),
});
export type ShopSettings = z.infer<typeof shopSettingsSchema>;
export const defaultShopSettings: ShopSettings = {
  enabled: false, announcement: "DESIGNED TO BE FELT, NOT JUST SMELLED",
  heroTitle: "Discover Auraic.\nFind your\nfragrance.", heroSubtitle: "Find the fragrance that feels like you.",
  menCollectionLabel: "SHOP FOR MEN", womenCollectionLabel: "SHOP FOR WOMEN",
  featuredEyebrow: "CHOSEN BY AURAIC", featuredTitle: "Best Sellers", offersTitle: "Offers", allProductsTitle: "All Products",
  storyEyebrow: "DESIGNED TO BE FELT", storyTitle: "More than a fragrance.\nA feeling that stays.",
  storyDescription: "Find the fragrance that feels like you. Make your presence unforgettable.", storyButtonLabel: "Find your Auraic",
  heroImages: [], heroMode: "images", heroInterval: 6, heroVideo: "", menCollectionImage: "", womenCollectionImage: "", menCollectionCategory: "رجالي", womenCollectionCategory: "حريمي", whatsapp: "", contactEmail: "", shippingRates: {}, shippingFee: 0, freeShippingFrom: 0,
  shippingPolicy: "", returnPolicy: "",
};
export const productPresentationSchema = z.object({
  id: z.string().min(1), published: z.boolean(), featured: z.boolean(),
  description: z.string().trim().max(10000), category: z.string().trim().min(1).max(80),
  inspiredBy: z.string().trim().max(160).default(""),
  scentFamily: z.string().trim().max(80).default(""),
  images: z.array(image).max(8),
});
export const governorates = ["القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "المنوفية", "الغربية", "الدقهلية", "الشرقية", "البحيرة", "كفر الشيخ", "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "الفيوم", "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "مطروح", "البحر الأحمر", "الوادي الجديد", "شمال سيناء", "جنوب سيناء"] as const;
export const checkoutSchema = z.object({
  note: z.string().trim().max(500).default(""),
  requestId: z.uuid(), name: z.string().trim().min(2).max(100),
  expectedTotalCents: z.number().int().positive().max(1000000000),
  phone: z.string().regex(/^01[0125]\d{8}$/, "راجع رقم الموبايل المصري"),
  governorate: z.enum(governorates), address: z.string().trim().min(10).max(400),
  items: z.array(z.object({ variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(20) })).min(1).max(20),
});

// Resolve retired default copy once at the settings boundary so editors and customers agree.
export function resolveShopSettings(value: unknown): ShopSettings {
  const settings = shopSettingsSchema.parse(value);
  if (["عطرك…أثرلاينسى", "عطرك...أثرلاينسى"].includes(settings.heroTitle.replace(/[\s\u064B-\u065F]/g, ""))) {
    settings.heroTitle = defaultShopSettings.heroTitle;
  }
  if (settings.featuredTitle === "Hand-picked\nby Auraic") settings.featuredTitle = "Best Sellers";
  return settings;
}

export function shippingFeeFor(settings: Pick<ShopSettings, "shippingFee" | "shippingRates">, governorate: string): number {
  return settings.shippingRates[governorate] ?? settings.shippingFee;
}
