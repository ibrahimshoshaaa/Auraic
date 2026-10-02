import { z } from "zod";

const image = z.string().url().max(2000).refine(value => value.startsWith("https://"), "استخدم رابط صورة HTTPS");
export const shopSettingsSchema = z.object({
  enabled: z.boolean(),
  announcement: z.string().trim().max(160),
  heroTitle: z.string().trim().min(1, "اكتب عنوان البانر الرئيسي").max(120),
  heroSubtitle: z.string().trim().max(400),
  heroImages: z.array(image).max(8),
  whatsapp: z.string().transform(value => { const cleaned = value.replace(/[^0-9]/g, ""); return cleaned.startsWith("01") ? `2${cleaned}` : cleaned.startsWith("0020") ? cleaned.slice(2) : cleaned; }).pipe(z.string().regex(/^$|^20\d{10}$/, "اكتب رقم واتساب مصري صحيح")),
  contactEmail: z.string().trim().pipe(z.union([z.literal(""), z.email("راجع بريد التواصل")])),
  shippingFee: z.number().finite().min(0).max(10000),
  freeShippingFrom: z.number().finite().min(0).max(1000000),
  shippingPolicy: z.string().trim().max(5000),
  returnPolicy: z.string().trim().max(5000),
});
export type ShopSettings = z.infer<typeof shopSettingsSchema>;
export const defaultShopSettings: ShopSettings = {
  enabled: false, announcement: "Auraic · عطر يُشعَر به، قبل أن يُشم",
  heroTitle: "عطرك… أثر لا يُنسى", heroSubtitle: "اكتشف عطور Auraic، واختر الرائحة التي تحكي عنك.",
  heroImages: [], whatsapp: "", contactEmail: "", shippingFee: 0, freeShippingFrom: 0,
  shippingPolicy: "", returnPolicy: "",
};
export const productPresentationSchema = z.object({
  id: z.string().min(1), published: z.boolean(), featured: z.boolean(),
  description: z.string().trim().max(10000), category: z.string().trim().min(1).max(80),
  images: z.array(image).max(8),
});
export const governorates = ["القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "المنوفية", "الغربية", "الدقهلية", "الشرقية", "البحيرة", "كفر الشيخ", "دمياط", "بورسعيد", "الإسماعيلية", "السويس", "الفيوم", "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "مطروح", "البحر الأحمر", "الوادي الجديد", "شمال سيناء", "جنوب سيناء"] as const;
export const checkoutSchema = z.object({
  requestId: z.uuid(), name: z.string().trim().min(2).max(100),
  expectedTotalCents: z.number().int().positive().max(1000000000),
  phone: z.string().regex(/^01[0125]\d{8}$/, "راجع رقم الموبايل المصري"),
  governorate: z.enum(governorates), address: z.string().trim().min(10).max(400),
  items: z.array(z.object({ variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(20) })).min(1).max(20),
});
