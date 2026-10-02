# إعداد Auraic على Vercel

## 1. الاستضافة وقاعدة البيانات
استورد `ibrahimshoshaaa/Auraic` في مشروع Vercel جديد. استخدم قاعدة PostgreSQL جديدة أو نسخة منفصلة من بياناتك للتجربة. نقل الكود لا ينقل المنتجات أو المستخدمين أو الطلبات تلقائيًا، ولا يغير استضافة yousef.

أضف:
- `DATABASE_URL`: رابط قاعدة PostgreSQL.
- `AUTH_SECRET`: قيمة عشوائية لا تقل عن 32 حرفًا.
- `NEXT_PUBLIC_APP_URL`: رابط مشروع Auraic الجديد كاملًا، يبدأ بـ HTTPS. يستخدم أيضًا للتحقق من مصدر طلبات checkout.

طبّق جميع الترحيلات قبل فتح الداش:
```bash
npx prisma migrate deploy
```
يمكن تشغيل workflow **Apply production database migrations** بعد إضافة `PRODUCTION_DATABASE_URL` إلى GitHub Actions environment `production`. هذا workflow يدوي، ولا ينقل بيانات من النظام القديم.

## 2. حساب المالك
لو قاعدة البيانات جديدة، نفذ من جهازك بعد ضبط المتغيرات:
```bash
npm run auth:bootstrap-owner
```
المتغيرات المؤقتة: `OWNER_EMAIL`, `OWNER_PASSWORD` (12 حرفًا أو أكثر), `OWNER_STORE_NAME=Auraic`. لا تحتاجها للتشغيل العادي بعد إنشاء الحساب. لو قاعدة البيانات نسخة من الحالية، ادخل بحسابك الموجود بدل إنشاء مالك جديد.

## 3. ربط الموقع بالمتجر
ادخل `/dashboard/storefront`. الصفحة تعرض معرّف متجرك. ضعه في Vercel باسم `STOREFRONT_STORE_ID` ثم أعد النشر.

أضف المنتجات والوصفات والمخزون من الداش الحالية. افتح «إدارة المتجر»، حدد قسم المنتج ووصفه وصوره، ثم انشره. المنتج لا يظهر للبيع إلا إذا كان له حجم نشط وسعر أكبر من صفر ووصفة نشطة بمكونات.

## 4. تفعيل الطلبات
من «إدارة المتجر»:
- اكتب سياسات الشحن والإرجاع الحقيقية.
- أضف رقم واتساب بصيغة `201xxxxxxxxx` أو بريد التواصل.
- حدد رسوم الشحن وعتبة الشحن المجاني (0 لإيقاف العتبة).
- فعل استقبال الطلبات واحفظ.

جرّب طلبًا من المتجر، وافتحه في الداش. تحقق من العنوان والهاتف والإجمالي، ثم جرّب التجهيز وراجع حركة خصم الخامات قبل بدء البيع الحقيقي.

## 5. رفع الصور (اختياري)
أضف `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` في Vercel، وأعد النشر. المفاتيح تستخدم على الخادم فقط. بدونها تستطيع استخدام روابط صور HTTPS مباشرة.

## 6. تطبيق الموبايل

تطبيق الإدارة داخل `mobile/` يحتاج إعادة بناء بـ `API_BASE_URL` الذي يشير للاستضافة الجديدة. لا توجّه نسخة جديدة إلى الإنتاج قبل إنهاء اختبار المتجر والمخزون.

لبناء Android من GitHub أضف repository variable باسم `API_BASE_URL` يشير لرابط Auraic، ثم شغّل workflow Flutter Android. القيمة الافتراضية للنسخة الجديدة هي https://auraic.vercel.app. فحص PR لا يبني APK؛ البناء يتم على main بعد الدمج.

## تحديث إزالة التكامل الخارجي
شغّل Apply production database migrations مرة أخرى لتطبيق الترحيل الجديد. يحذف بيانات الربط والمفاتيح وسجلات المزامنة فقط، ويحافظ على سجلات العمل والطلبات ويحوّل الطلبات القديمة إلى متابعة محلية. أعد بناء الموبايل للحصول على الواجهة الجديدة.

## الأحجام والخصومات وإدارة الموبايل
شغّل Apply production database migrations بعد تحديث الأسعار لإضافة compareAtPrice. إضافة المنتج وتعديله أصبحت تشمل جميع الأحجام وأسعارها ووصفاتها في عملية واحدة. السعر قبل الخصم اختياري ويجب أن يتجاوز سعر البيع.
إدارة الموقع متاحة من الويب والموبايل. حالة استقبال الطلبات تتحفظ فورًا؛ احفظ تعديلات البانرات والشحن والتواصل بالزر المخصص. رقم واتساب يقبل الصيغة المحلية أو الدولية. في الموبايل تُضاف الصور بروابط HTTPS.

### Fragrance cards and product details

In **Dashboard → Storefront → Store products**, edit each fragrance's description, audience, photos, optional **Inspired by** and **Scent family**. Edit sizes, prices and recipes through the existing **Edit sizes and prices** link. Only active, positive-price sizes with a current recipe appear in the public store. Cards let customers select a size and add it directly to their bag; the detail page has a photo gallery and a mobile quick-add bar. Prices and discounts follow the selected size. Reviews are not displayed until a real review system is available.

Apply migration `20261002183500_product_fragrance_details` with `npx prisma migrate deploy` before deploying this version. It adds two optional text fields with empty defaults and preserves existing products.
