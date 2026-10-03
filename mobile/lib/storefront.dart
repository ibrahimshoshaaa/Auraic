import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api.dart';
import 'recipe_picker.dart';
import 'product_images.dart';
import 'ui.dart';

const shippingGovernorates = ['القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'المنوفية', 'الغربية', 'الدقهلية', 'الشرقية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'مطروح', 'البحر الأحمر', 'الوادي الجديد', 'شمال سيناء', 'جنوب سيناء'];

bool isSampleCategory(String value) => RegExp(r"^samples(?::(?:men|women|unisex))?$").hasMatch(value.trim().toLowerCase());

String audienceCategory(String value) {
  final category = value.trim().toLowerCase().replaceFirst('samples:', '');

  if (['men', 'male', 'رجالي', 'رجال', 'عطور رجالي'].contains(category)) return 'Men';
  if (['women', 'female', 'حريمي', 'نسائي', 'نساء', 'عطور حريمي'].contains(category)) return 'Women';
  return 'Unisex';
}

class StorefrontPage extends StatefulWidget {
  const StorefrontPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<StorefrontPage> createState() => _StorefrontPageState();
}
class _StorefrontPageState extends State<StorefrontPage> {
  late Future<dynamic> result = widget.api.get('/api/admin/storefront');
  void reload() => setState(() => result = widget.api.get('/api/admin/storefront'));
  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(future: result, builder: (context, snapshot) {
    if (!snapshot.hasData) return snapshot.hasError ? Center(child: TextButton(onPressed: reload, child: Text('${snapshot.error} · إعادة المحاولة'))) : const PageSkeleton();
    final data = json(snapshot.data['data']);
    return ListView(padding: const EdgeInsets.all(16), children: [
      const PageIntro(title: 'إدارة الموقع', subtitle: 'واجهة المتجر والشحن والمنتجات من مكان واحد', icon: Icons.storefront_outlined),
      const SizedBox(height: 16),
      Row(children: [Expanded(child: OutlinedButton.icon(onPressed: () async {
        final opened = await launchUrl(Uri.parse(widget.api.baseUrl).replace(path: '/', query: null, fragment: null), mode: LaunchMode.externalApplication);
        if (!opened && context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر فتح معاينة المتجر')));
      }, icon: const Icon(Icons.open_in_new), label: const Text('معاينة المتجر')),), IconButton(onPressed: reload, tooltip: 'تحديث بيانات الموقع', icon: const Icon(Icons.refresh))]),
      const SizedBox(height: 16),
      if (data['linked'] != true) Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [const Text('اضبط STOREFRONT_STORE_ID في Vercel على:'), SelectableText(str(data['storeId']))]))),
      if (data['owner'] == true) StorefrontSettings(key: ValueKey(result), api: widget.api, initial: json(data['settings'])),
      const SizedBox(height: 20),
      FilledButton.icon(onPressed: () async { final saved = await openPage<bool>(context, ProductManagePage(api: widget.api)); if (saved == true) reload(); }, icon: const Icon(Icons.add), label: const Text('إضافة عطر وأحجامه')),
      const SizedBox(height: 16),
      const Text('منتجات المتجر', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
      for (final product in (data['products'] as List).map(json)) Card(margin: const EdgeInsets.only(top: 14), child: ListTile(
        leading: const Icon(Icons.inventory_2_outlined), title: Text(str(product['title'])),
        subtitle: Text('${product['storefrontPublished'] == true ? 'منشور' : 'غير منشور'} · ${(product['variants'] as List).length} أحجام'), trailing: const Icon(Icons.edit_outlined),
        onTap: () async { final saved = await openPage<bool>(context, ProductManagePage(api: widget.api, productId: str(product['id']))); if (saved == true) reload(); })),
    ]);
  });
}

class StorefrontSettings extends StatefulWidget {
  const StorefrontSettings({required this.api, required this.initial, super.key});
  final ErpApi api;
  final Json initial;
  @override
  State<StorefrontSettings> createState() => _StorefrontSettingsState();
}
class _StorefrontSettingsState extends State<StorefrontSettings> {
  final form = GlobalKey<FormState>();
  late final Json settings = Map<String, dynamic>.from(widget.initial);
  late final Json shippingRates = Map<String, dynamic>.from(json(settings['shippingRates']));
  bool busy = false;
  String message = '';
  bool failed = false;
  Widget field(String name, String label, {int lines = 1, bool number = false}) => Padding(padding: const EdgeInsets.only(bottom: 16), child: TextFormField(
    initialValue: name == 'heroImages' ? (settings[name] as List).join('\n') : str(settings[name]), maxLines: lines,
    keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : lines > 1 ? TextInputType.multiline : TextInputType.text,
    enabled: !busy,
    decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    validator: number ? (value) => double.tryParse(value ?? '') == null || double.parse(value!) < 0 ? 'أدخل مبلغًا صحيحًا' : null : null,
    onChanged: (value) => settings[name] = name == 'heroImages' ? value.split('\n').map((v) => v.trim()).where((v) => v.isNotEmpty).toList() : number ? double.tryParse(value) ?? -1 : value));
  Future<void> save({bool toggle = false}) async {
    if (!toggle && !form.currentState!.validate()) return;
    if (!toggle) settings['shippingRates'] = shippingRates;
    setState(() { busy = true; message = ''; failed = false; });
    try {
      final enabled = settings['enabled'] == true;
      await widget.api.put('/api/admin/storefront', {'kind': toggle ? 'availability' : 'settings', 'data': toggle ? {'enabled': !enabled} : settings});
      if (mounted) setState(() { if (toggle) settings['enabled'] = !enabled; message = 'تم الحفظ بنجاح'; });
    } catch (error) { if (mounted) setState(() { failed = true; message = '$error'; }); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Widget shippingRate(String name) => Padding(padding: const EdgeInsets.only(bottom: 16), child: TextFormField(
    key: ValueKey('shipping-$name'), initialValue: str(shippingRates[name]), enabled: !busy,
    keyboardType: const TextInputType.numberWithOptions(decimal: true),
    decoration: InputDecoration(labelText: name, hintText: 'فارغ = السعر الافتراضي', border: const OutlineInputBorder()),
    validator: (value) { if ((value ?? '').trim().isEmpty) return null; final fee = double.tryParse(value!); return fee == null || !fee.isFinite || fee < 0 || fee > 10000 ? 'أدخل سعرًا من 0 إلى 10000' : null; },
    onChanged: (value) { if (value.trim().isEmpty) { shippingRates.remove(name); } else { shippingRates[name] = double.tryParse(value) ?? -1; } }));
  Widget section(String title, List<Widget> children) => Card(margin: const EdgeInsets.only(bottom: 14), child: ExpansionTile(title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), childrenPadding: const EdgeInsets.all(16), children: children));
  @override
  Widget build(BuildContext context) => Form(key: form, child: Column(children: [
    Card(color: appNavy, child: SwitchListTile(title: const Text('استقبال طلبات العملاء', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)), subtitle: const Text('الحالة تتحفظ فورًا', style: TextStyle(color: Colors.white70)), value: settings['enabled'] == true, onChanged: busy ? null : (_) => save(toggle: true))),
    if (message.isNotEmpty) Padding(padding: const EdgeInsets.all(12), child: Text(message, style: TextStyle(color: failed ? Colors.red : Colors.green))),
    section('التصميم والبانرات', [field('announcement', 'الشريط العلوي'), field('heroTitle', 'عنوان الهيرو الظاهر للعميل', lines: 3), DropdownButtonFormField<String>(initialValue: str(settings['heroMode']).isEmpty ? 'images' : str(settings['heroMode']), decoration: const InputDecoration(labelText: 'نوع الهيرو'), items: const [DropdownMenuItem(value: 'images', child: Text('صور سلايدر')), DropdownMenuItem(value: 'video', child: Text('فيديو'))], onChanged: busy ? null : (value) => settings['heroMode'] = value), const SizedBox(height: 16), field('heroInterval', 'مدة الصورة بالثواني (2–60)', number: true), field('heroVideo', 'رابط ملف فيديو HTTPS مباشر'), const Text('استخدم ملف MP4 أو WebM مباشر، وليس رابط مشاركة Facebook أو YouTube.'), const SizedBox(height: 16), field('heroImages', 'روابط صور البانر HTTPS، رابط في كل سطر', lines: 4)]),
    section('صورة قسم السامبلز', [const Text('صورة واحدة ثابتة تظهر أعلى صفحة Samples. لا تتغير مع اختيارات العميل.'), const SizedBox(height: 16), ProductImages(api: widget.api, maxImages: 1, initial: str(settings['samplesImage']).isEmpty ? [] : [str(settings['samplesImage'])], onChanged: (images) => settings['samplesImage'] = images.isEmpty ? '' : images.first, onBusy: (value) { if (mounted) setState(() => busy = value); })]),
    section('زرارا الأقسام داخل الهيرو', [field('menCollectionLabel', 'نص زر الرجال'), field('womenCollectionLabel', 'نص زر السيدات'), const Text('الصور تأتي من خلفية الهيرو. تصنيف المنتج يحدد ظهوره، والمنتج للجنسين يظهر في القسمين.')]),
    section('المنتجات المختارة', [field('featuredEyebrow', 'النص الصغير فوق المنتجات'), field('featuredTitle', 'عنوان Best Sellers', lines: 2), field('offersTitle', 'عنوان Offers'), field('allProductsTitle', 'عنوان All Products'), const Text('زر SHOW NOTES يعرض الوصف المسجل لكل عطر في منتجات المتجر.')]),
    section('التعريف بالعلامة', [field('storyEyebrow', 'النص الصغير في جزء التعريف'), field('storyTitle', 'عنوان التعريف', lines: 2), field('storyDescription', 'وصف التعريف', lines: 3), field('storyButtonLabel', 'نص زر التعريف')]),
    section('التواصل', [const Text('الرقم يظهر في صفحة التواصل وزر واتساب الثابت. استخدم 010xxxxxxxx أو +2010xxxxxxxx.'), const SizedBox(height: 16), field('whatsapp', 'رقم واتساب'), field('contactEmail', 'بريد التواصل')]),
    section('الشحن والسياسات', [field('shippingFee', 'رسوم الشحن الافتراضية', number: true), const Text('حدد سعر كل محافظة: ٦٠ أو ٩٠ أو أي سعر. الفارغ يستخدم السعر الافتراضي، والصفر يعني شحن مجاني.'), const SizedBox(height: 16), for (final name in shippingGovernorates) shippingRate(name), field('freeShippingFrom', 'شحن مجاني من (0 لإيقافه)', number: true), field('shippingPolicy', 'سياسة الشحن', lines: 4), field('returnPolicy', 'سياسة الإرجاع', lines: 4)]),
    SizedBox(width: double.infinity, child: FilledButton(onPressed: busy ? null : () => save(), child: Text(busy ? 'جارٍ الحفظ…' : 'حفظ تعديلات الموقع'))),
  ]));
}

class ProductManagePage extends StatefulWidget {
  const ProductManagePage({required this.api, this.productId, this.sample = false, super.key});
  final ErpApi api;
  final String? productId;
  final bool sample;
  @override
  State<ProductManagePage> createState() => _ProductManagePageState();
}
class _ProductManagePageState extends State<ProductManagePage> {
  final form = GlobalKey<FormState>();
  final requestId = const Uuid().v4();
  Json product = {'title': '', 'description': '', 'category': 'Unisex', 'inspiredBy': '', 'scentFamily': '', 'images': <String>[], 'published': false, 'featured': false};
  List<Json> variants = [];
  late Future<List<Json>> materials = load();
  late bool sampleType = widget.sample;
  bool offers = false;
  void toggleOffers(bool value) => setState(() { offers = value; if (!value) { for (final v in variants) { v['compareAtPrice'] = ''; } } });
  int step = 0;
  final steps = const ['بيانات العطر', 'الصور', 'الأحجام والوصفات', 'الوصف والنشر', 'المعاينة والتأكيد'];
  bool busy = false;
  String error = '';
  Json blank() => {'clientId': const Uuid().v4(), 'title': '', 'price': '', 'compareAtPrice': '', 'materials': <Json>[]};
  Future<List<Json>> load() async {
    final available = rows(await widget.api.get('/api/materials'));
    if (widget.productId != null) {
      final p = json((await widget.api.get('/api/products/${widget.productId}'))['data']);
      sampleType = isSampleCategory(str(p['storefrontCategory']));
      product = {'title': p['title'], 'description': p['storefrontDescription'], 'category': audienceCategory(str(p['storefrontCategory'])), 'inspiredBy': str(p['storefrontInspiredBy']), 'scentFamily': str(p['storefrontScentFamily']), 'images': p['storefrontImages'], 'published': p['storefrontPublished'], 'featured': p['storefrontFeatured']};
      variants = (p['variants'] as List).map(json).where((v) => v['active'] == true).map((v) {
        final recipes = rows({'data': v['recipes']});
        final versions = recipes.isEmpty ? <Json>[] : rows({'data': recipes.first['versions']});
        final items = versions.isEmpty ? <Json>[] : rows({'data': versions.first['items']});
        return <String, dynamic>{'id': v['id'], 'clientId': const Uuid().v4(), 'title': v['title'], 'price': v['price'], 'compareAtPrice': v['compareAtPrice'] ?? '', 'materials': items.isEmpty ? <Json>[{'materialId': '', 'quantity': ''}] : items.map((m) => <String, dynamic>{'materialId': m['materialId'], 'quantity': m['quantity']}).toList()};
      }).toList();
    }
    if (variants.isEmpty) variants = [blank()];
    offers = variants.any((v) => (double.tryParse(str(v['compareAtPrice'])) ?? 0) > (double.tryParse(str(v['price'])) ?? 0));
    if (mounted) setState(() {});
    return available;
  }
  Widget field(Json target, String name, String label, {bool number = false, bool required = true, int lines = 1}) => Padding(padding: const EdgeInsets.only(bottom: 16), child: TextFormField(
    key: ValueKey("${identityHashCode(target)}-$name-${target['_titleRevision'] ?? 0}"), initialValue: str(target[name]), maxLines: lines,
    keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : lines > 1 ? TextInputType.multiline : TextInputType.text,
    decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    validator: (value) { if (!required && (value ?? '').trim().isEmpty) return null; if ((value ?? '').trim().isEmpty) return 'الحقل مطلوب'; if (number && (double.tryParse(value!) == null || double.parse(value) <= 0)) return 'أدخل قيمة أكبر من صفر'; return null; },
    onChanged: (value) => setState(() => target[name] = value)));
  void next() {
    if (!(form.currentState?.validate() ?? false)) return;
    if (step == 2 && variants.any((variant) => (variant['materials'] as List).isEmpty || (variant['materials'] as List).any((line) => str(line['materialId']).isEmpty || (double.tryParse(str(line['quantity'])) ?? 0) <= 0))) { setState(() => error = 'اختر خامات كل حجم وحدد كمياتها قبل المتابعة'); return; }
    setState(() { step++; error = ''; });
  }
  Widget costPreview(Json variant, List<Json> available) {
    double total = 0;
    bool complete = (variant['materials'] as List).isNotEmpty;
    for (final line in (variant['materials'] as List).map(json)) {
      final matches = available.where((m) => m['id'] == line['materialId']);
      final quantity = double.tryParse(str(line['quantity']));
      final unitCost = matches.isEmpty ? null : double.tryParse(str(matches.first['defaultCost']));
      if (unitCost == null || quantity == null || quantity <= 0) { complete = false; } else { total += quantity * unitCost; }
    }
    final price = double.tryParse(str(variant['price'])) ?? 0;
    return Container(width: double.infinity, padding: const EdgeInsets.all(16), margin: const EdgeInsets.only(top: 12), decoration: BoxDecoration(color: const Color(0xfff5f3eb), borderRadius: BorderRadius.circular(14)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(complete ? 'تكلفة الوصفة للقطعة: ${total.toStringAsFixed(2)} جنيه' : 'أكمل كميات وتكاليف الخامات في المخزون'),
      if (complete && price > 0) Text('الربح المتوقع: ${(price-total).toStringAsFixed(2)} جنيه · ${((price-total)/price*100).toStringAsFixed(2)}٪'),
      const SizedBox(height: 8), const Text('قبل المصروفات التشغيلية، حسب تكلفة الخامات الحالية. للإدارة فقط.', style: TextStyle(fontSize: 12, color: appMuted)),
    ]));
  }
  Future<void> save() async {
    if (step != 4 || busy) return;
    if (offers && !variants.any((v) => (double.tryParse(str(v['compareAtPrice'])) ?? 0) > (double.tryParse(str(v['price'])) ?? 0))) { setState(() { error = 'أدخل سعرًا قبل الخصم أعلى من سعر البيع لحجم واحد على الأقل'; step = 2; }); return; }
    setState(() { busy = true; error = ''; });
    try {
      final data = <String, dynamic>{...product, 'category': sampleType ? 'Samples:${product['category']}' : product['category'], 'requestId': requestId, if (widget.productId != null) 'productId': widget.productId,
        'variants': variants.map((v) => {...v, 'price': double.tryParse(str(v['price'])), 'compareAtPrice': str(v['compareAtPrice']).isEmpty ? null : double.tryParse(str(v['compareAtPrice'])), 'materials': (v['materials'] as List).map(json).map((m) => {'materialId': m['materialId'], 'quantity': double.tryParse(str(m['quantity']))}).toList()}).toList()};
      await widget.api.post('/api/products/manage', data);
      if (mounted) Navigator.pop(context, true);
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(widget.productId == null ? (sampleType ? 'إضافة سامبلز' : 'إضافة عطر وأحجامه') : 'تعديل المنتج')),
    bottomNavigationBar: SafeArea(child: Container(padding: const EdgeInsets.all(12), decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Color(0xffe5e7eb)))), child: Row(children: [if (step > 0) ...[OutlinedButton(onPressed: busy ? null : () => setState(() => step--), child: const Text('السابق')), const SizedBox(width: 8)], OutlinedButton(onPressed: busy ? null : () => Navigator.pop(context), child: const Text('إلغاء')), const SizedBox(width: 8), Expanded(child: FilledButton(key: ValueKey('step-action-$step'), onPressed: busy || variants.isEmpty ? null : step == 4 ? save : next, child: Text(busy ? 'جارٍ الحفظ…' : step == 4 ? 'تأكيد حفظ المنتج' : step == 3 ? 'معاينة المنتج' : 'التالي')))]))),
    body: FutureBuilder<List<Json>>(future: materials, builder: (context, snapshot) {
      if (!snapshot.hasData) return snapshot.hasError ? Center(child: TextButton(onPressed: () => setState(() => materials = load()), child: Text('${snapshot.error} · إعادة المحاولة'))) : const PageSkeleton();
      final available = snapshot.data!;
      return Form(key: form, child: ListView(padding: const EdgeInsets.all(16), children: [
        if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(error, style: const TextStyle(color: Colors.red))),
        Row(children: List.generate(5, (index) => Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 3), child: InkWell(onTap: !busy && index < step ? () => setState(() => step = index) : null, borderRadius: BorderRadius.circular(14), child: Container(padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 2), decoration: BoxDecoration(color: step == index ? appNavy : const Color(0xfff4f5f8), borderRadius: BorderRadius.circular(14)), child: Column(children: [Icon(index < step ? Icons.check_circle_outline : [Icons.inventory_2_outlined, Icons.image_outlined, Icons.science_outlined, Icons.description_outlined, Icons.task_alt][index], color: step == index ? Colors.white : appMuted, size: 22), const SizedBox(height: 8), Text(['البيانات', 'الصور', 'الوصفة', 'التفاصيل', 'التأكيد'][index], style: TextStyle(fontSize: 10, color: step == index ? Colors.white : appMuted))]))))))),
        const SizedBox(height: 24),
        if (step == 0) Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [field(product, 'title', 'اسم العطر، مثال: عود'), DropdownButtonFormField<bool>(initialValue: sampleType, decoration: const InputDecoration(labelText: 'نوع المنتج'), items: const [DropdownMenuItem(value: false, child: Text('عطر')), DropdownMenuItem(value: true, child: Text('سامبل / تيستر'))], onChanged: busy ? null : (value) => setState(() => sampleType = value ?? false)), const SizedBox(height: 16), DropdownButtonFormField<String>(initialValue: str(product['category']), decoration: const InputDecoration(labelText: 'موجّه إلى', border: OutlineInputBorder()), items: const [DropdownMenuItem(value: 'Men', child: Text('رجالي')), DropdownMenuItem(value: 'Women', child: Text('حريمي')), DropdownMenuItem(value: 'Unisex', child: Text('للجنسين (Unisex)'))], onChanged: busy ? null : (value) => product['category'] = value), const SizedBox(height: 16), const Text('للجنسين يظهر في For Men وFor Women. السامبل يظهر في Samples فقط، وله صور وسعر ووصفة مثل أي منتج.'), const Text('اسم واحد يجمع كل أحجام العطر في المتجر.')] ))),
        if (step == 1) ProductImages(api: widget.api, initial: (product['images'] as List).map(str).toList(), onChanged: (images) => product['images'] = images, onBusy: (value) { if (mounted) setState(() => busy = value); }),
        if (step == 2) ...[

        const SizedBox(height: 16),
        SwitchListTile(value: offers, onChanged: busy ? null : toggleOffers, title: const Text('عليه خصم ويظهر في Offers')),
        const Text('كل حجم له سعر ووصفة مستقلة', style: TextStyle(fontWeight: FontWeight.w800)),
        for (final v in variants) Card(key: ValueKey(v['clientId']), margin: const EdgeInsets.only(top: 14), child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
          Row(children: [const Expanded(child: Text('بيانات الحجم', style: TextStyle(fontWeight: FontWeight.w800))), if (variants.length > 1) IconButton(onPressed: busy ? null : () => setState(() => variants.remove(v)), icon: const Icon(Icons.delete_outline, color: Colors.red))]),
          Wrap(spacing: 8, children: [2, 5, 10, 30, 50, 100].map((size) => ChoiceChip(label: Text('$size ml'), selected: v['title'] == '$size ml', onSelected: busy ? null : (_) => setState(() { v['title'] = '$size ml'; v['_titleRevision'] = (v['_titleRevision'] as int? ?? 0) + 1; }))).toList()),
          field(v, 'title', 'الحجم، مثال: ٣٠ مل'), field(v, 'price', 'سعر البيع', number: true), if (offers) field(v, 'compareAtPrice', 'السعر قبل الخصم (اختياري لباقي الأحجام)', number: true, required: false),
          RecipePicker(materials: available, lines: (v['materials'] as List).map(json).toList(), disabled: busy, onChanged: (lines) => setState(() => v['materials'] = lines)),
          if (variants.indexOf(v) > 0) TextButton(onPressed: busy ? null : () => setState(() => v['materials'] = (variants.first['materials'] as List).map((m) => <String, dynamic>{...json(m)}).toList()), child: const Text('نسخ خامات الحجم الأول ثم تعديل الكميات')),
          costPreview(v, available),

        ]))),
        const SizedBox(height: 16), OutlinedButton.icon(onPressed: busy || variants.length >= 20 ? null : () => setState(() => variants.add(blank())), icon: const Icon(Icons.add), label: const Text('إضافة حجم آخر')),
        ],
        if (step == 3) ...[
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [field(product, 'description', 'وصف العطر', required: false, lines: 5), field(product, 'inspiredBy', 'مستوحى من (اختياري)', required: false), field(product, 'scentFamily', 'طابع العطر (اختياري)', required: false)]))),
        SwitchListTile(value: product['published'] == true, onChanged: busy ? null : (value) => setState(() => product['published'] = value), title: const Text('ظاهر للعملاء في المتجر')),
        SwitchListTile(value: product['featured'] == true, onChanged: busy ? null : (value) => setState(() => product['featured'] = value), title: const Text('يظهر في Best Sellers')),
        const Text('الوصفات والطلبات السابقة تظل محفوظة عند تعديل المنتج أو إزالة حجم.', style: TextStyle(color: appMuted)),
        ],
        if (step == 4) ...[
          Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(str(product['title']), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)), Text(str(product['category'])), if ((product['images'] as List).isNotEmpty) Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Wrap(spacing: 12, runSpacing: 12, children: (product['images'] as List).map((url) => ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(str(url), width: 90, height: 110, fit: BoxFit.cover, errorBuilder: (context, failure, stack) => const SizedBox(width: 90, height: 110, child: Icon(Icons.broken_image_outlined))))).toList())), const SizedBox(height: 12), Text(str(product['description'])), if (str(product['inspiredBy']).isNotEmpty) Text('مستوحى من: ${product['inspiredBy']}'), if (str(product['scentFamily']).isNotEmpty) Text('طابع العطر: ${product['scentFamily']}'), Text(product['published'] == true ? 'سيظهر للعملاء' : 'مسودة غير منشورة')]))),
          for (final v in variants) Card(margin: const EdgeInsets.only(top: 16), child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${v['title']} · ${v['price']} جنيه', style: const TextStyle(fontWeight: FontWeight.w800)), for (final m in (v['materials'] as List).map(json)) Text('${available.where((a) => a['id'] == m['materialId']).map((a) => a['name']).join()} · ${m['quantity']}'), costPreview(v, available)]))),
          const SizedBox(height: 16), const Text('لم يُحفظ المنتج بعد. راجع التفاصيل ثم أكد الحفظ.'),
        ],
        const SizedBox(height: 20),
        if (available.isEmpty) const Text('أضف خامات المخزون أولًا'),
      ]));
    }));
}
