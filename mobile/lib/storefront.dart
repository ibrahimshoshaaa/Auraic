import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'api.dart';
import 'ui.dart';

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
  bool busy = false;
  String message = '';
  bool failed = false;
  Widget field(String name, String label, {int lines = 1, bool number = false}) => Padding(padding: const EdgeInsets.only(bottom: 16), child: TextFormField(
    initialValue: name == 'heroImages' ? (settings[name] as List).join('\n') : str(settings[name]), maxLines: lines,
    keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : lines > 1 ? TextInputType.multiline : TextInputType.text,
    decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    validator: number ? (value) => double.tryParse(value ?? '') == null || double.parse(value!) < 0 ? 'أدخل مبلغًا صحيحًا' : null : null,
    onChanged: (value) => settings[name] = name == 'heroImages' ? value.split('\n').map((v) => v.trim()).where((v) => v.isNotEmpty).toList() : number ? double.tryParse(value) ?? -1 : value));
  Future<void> save({bool toggle = false}) async {
    if (!toggle && !form.currentState!.validate()) return;
    setState(() { busy = true; message = ''; failed = false; });
    try {
      final enabled = settings['enabled'] == true;
      await widget.api.put('/api/admin/storefront', {'kind': toggle ? 'availability' : 'settings', 'data': toggle ? {'enabled': !enabled} : settings});
      if (mounted) setState(() { if (toggle) settings['enabled'] = !enabled; message = 'تم الحفظ بنجاح'; });
    } catch (error) { if (mounted) setState(() { failed = true; message = '$error'; }); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Widget section(String title, List<Widget> children) => Card(margin: const EdgeInsets.only(bottom: 14), child: ExpansionTile(title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), childrenPadding: const EdgeInsets.all(16), children: children));
  @override
  Widget build(BuildContext context) => Form(key: form, child: Column(children: [
    Card(color: appNavy, child: SwitchListTile(title: const Text('استقبال طلبات العملاء', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)), subtitle: const Text('الحالة تتحفظ فورًا', style: TextStyle(color: Colors.white70)), value: settings['enabled'] == true, onChanged: busy ? null : (_) => save(toggle: true))),
    if (message.isNotEmpty) Padding(padding: const EdgeInsets.all(12), child: Text(message, style: TextStyle(color: failed ? Colors.red : Colors.green))),
    section('التصميم والبانرات', [field('announcement', 'الشريط العلوي'), field('heroTitle', 'عنوان البانر'), field('heroSubtitle', 'وصف البانر', lines: 3), DropdownButtonFormField<String>(initialValue: str(settings['heroMode']).isEmpty ? 'images' : str(settings['heroMode']), decoration: const InputDecoration(labelText: 'نوع الهيرو'), items: const [DropdownMenuItem(value: 'images', child: Text('صور سلايدر')), DropdownMenuItem(value: 'video', child: Text('فيديو'))], onChanged: busy ? null : (value) => settings['heroMode'] = value), const SizedBox(height: 16), field('heroInterval', 'مدة الصورة بالثواني (2–60)', number: true), field('heroVideo', 'رابط فيديو HTTPS مباشر'), field('heroImages', 'روابط صور البانر HTTPS، رابط في كل سطر', lines: 4)]),
    section('الكولكشن', [field('menCollectionCategory', 'اسم قسم المنتجات الرجالي'), field('menCollectionImage', 'رابط صورة الكولكشن الرجالي HTTPS'), field('womenCollectionCategory', 'اسم قسم المنتجات الحريمي'), field('womenCollectionImage', 'رابط صورة الكولكشن الحريمي HTTPS')]),
    section('التواصل', [field('whatsapp', 'رقم واتساب'), field('contactEmail', 'بريد التواصل')]),
    section('الشحن والسياسات', [field('shippingFee', 'رسوم الشحن', number: true), field('freeShippingFrom', 'شحن مجاني من (0 لإيقافه)', number: true), field('shippingPolicy', 'سياسة الشحن', lines: 4), field('returnPolicy', 'سياسة الإرجاع', lines: 4)]),
    SizedBox(width: double.infinity, child: FilledButton(onPressed: busy ? null : () => save(), child: Text(busy ? 'جارٍ الحفظ…' : 'حفظ تعديلات الموقع'))),
  ]));
}

class ProductManagePage extends StatefulWidget {
  const ProductManagePage({required this.api, this.productId, super.key});
  final ErpApi api;
  final String? productId;
  @override
  State<ProductManagePage> createState() => _ProductManagePageState();
}
class _ProductManagePageState extends State<ProductManagePage> {
  final form = GlobalKey<FormState>();
  final requestId = const Uuid().v4();
  Json product = {'title': '', 'description': '', 'category': 'العطور', 'images': <String>[], 'published': false, 'featured': false};
  List<Json> variants = [];
  late Future<List<Json>> materials = load();
  int step = 0;
  final steps = const ['بيانات العطر', 'الصور', 'الأحجام والوصفات', 'الوصف والنشر', 'المعاينة والتأكيد'];
  bool busy = false;
  String error = '';
  Json blank() => {'clientId': const Uuid().v4(), 'title': '', 'price': '', 'compareAtPrice': '', 'materials': <Json>[{'materialId': '', 'quantity': ''}]};
  Future<List<Json>> load() async {
    final available = rows(await widget.api.get('/api/materials'));
    if (widget.productId != null) {
      final p = json((await widget.api.get('/api/products/${widget.productId}'))['data']);
      product = {'title': p['title'], 'description': p['storefrontDescription'], 'category': p['storefrontCategory'], 'images': p['storefrontImages'], 'published': p['storefrontPublished'], 'featured': p['storefrontFeatured']};
      variants = (p['variants'] as List).map(json).where((v) => v['active'] == true).map((v) {
        final recipes = rows({'data': v['recipes']});
        final versions = recipes.isEmpty ? <Json>[] : rows({'data': recipes.first['versions']});
        final items = versions.isEmpty ? <Json>[] : rows({'data': versions.first['items']});
        return <String, dynamic>{'id': v['id'], 'clientId': const Uuid().v4(), 'title': v['title'], 'price': v['price'], 'compareAtPrice': v['compareAtPrice'] ?? '', 'materials': items.isEmpty ? <Json>[{'materialId': '', 'quantity': ''}] : items.map((m) => <String, dynamic>{'materialId': m['materialId'], 'quantity': m['quantity']}).toList()};
      }).toList();
    }
    if (variants.isEmpty) variants = [blank()];
    return available;
  }
  Widget field(Json target, String name, String label, {bool number = false, bool required = true, int lines = 1}) => Padding(padding: const EdgeInsets.only(bottom: 16), child: TextFormField(
    key: ValueKey("${identityHashCode(target)}-$name"), initialValue: str(target[name]), maxLines: lines,
    keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : lines > 1 ? TextInputType.multiline : TextInputType.text,
    decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
    validator: (value) { if (!required && (value ?? '').trim().isEmpty) return null; if ((value ?? '').trim().isEmpty) return 'الحقل مطلوب'; if (number && (double.tryParse(value!) == null || double.parse(value) <= 0)) return 'أدخل قيمة أكبر من صفر'; return null; },
    onChanged: (value) => setState(() => target[name] = value)));
  void next() {
    if (!(form.currentState?.validate() ?? false)) return;
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
    setState(() { busy = true; error = ''; });
    try {
      final data = <String, dynamic>{...product, 'requestId': requestId, if (widget.productId != null) 'productId': widget.productId,
        'variants': variants.map((v) => {...v, 'price': double.tryParse(str(v['price'])), 'compareAtPrice': str(v['compareAtPrice']).isEmpty ? null : double.tryParse(str(v['compareAtPrice'])), 'materials': (v['materials'] as List).map(json).map((m) => {'materialId': m['materialId'], 'quantity': double.tryParse(str(m['quantity']))}).toList()}).toList()};
      await widget.api.post('/api/products/manage', data);
      if (mounted) Navigator.pop(context, true);
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: Text(widget.productId == null ? 'إضافة عطر وأحجامه' : 'تعديل المنتج')),
    body: FutureBuilder<List<Json>>(future: materials, builder: (context, snapshot) {
      if (!snapshot.hasData) return snapshot.hasError ? Center(child: TextButton(onPressed: () => setState(() => materials = load()), child: Text('${snapshot.error} · إعادة المحاولة'))) : const PageSkeleton();
      final available = snapshot.data!;
      return Form(key: form, child: ListView(padding: const EdgeInsets.all(16), children: [
        if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(error, style: const TextStyle(color: Colors.red))),
        Text('الخطوة ${step + 1} من 5 · ${steps[step]}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12), LinearProgressIndicator(value: (step+1)/5), const SizedBox(height: 24),
        if (step == 0) Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [field(product, 'title', 'اسم العطر، مثال: عود'), field(product, 'category', 'القسم'), const Text('اسم واحد يجمع كل أحجام العطر في المتجر.')] ))),
        if (step == 1) Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [const Text('الصورة الأولى رئيسية. أضف حتى 8 صور.'), const SizedBox(height: 16), TextFormField(key: const ValueKey('product-images'), initialValue: (product['images'] as List).join('\n'), maxLines: 5, decoration: const InputDecoration(labelText: 'روابط الصور HTTPS، رابط في كل سطر', border: OutlineInputBorder()), validator: (value) { final urls = (value ?? '').split('\n').map((v) => v.trim()).where((v) => v.isNotEmpty).toList(); return urls.length > 8 || urls.any((url) => Uri.tryParse(url)?.scheme != 'https' || (Uri.tryParse(url)?.host ?? '').isEmpty) ? 'أدخل حتى 8 روابط HTTPS صحيحة' : null; }, onChanged: (value) => product['images'] = value.split('\n').map((v) => v.trim()).where((v) => v.isNotEmpty).toList())]))),
        if (step == 2) ...[

        const SizedBox(height: 16),
        const Text('كل حجم له سعر ووصفة مستقلة', style: TextStyle(fontWeight: FontWeight.w800)),
        for (final v in variants) Card(key: ValueKey(v['clientId']), margin: const EdgeInsets.only(top: 14), child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
          Row(children: [const Expanded(child: Text('بيانات الحجم', style: TextStyle(fontWeight: FontWeight.w800))), if (variants.length > 1) IconButton(onPressed: busy ? null : () => setState(() => variants.remove(v)), icon: const Icon(Icons.delete_outline, color: Colors.red))]),
          field(v, 'title', 'الحجم، مثال: ٣٠ مل'), field(v, 'price', 'سعر البيع', number: true), field(v, 'compareAtPrice', 'السعر قبل الخصم (اختياري)', number: true, required: false),
          for (final m in (v['materials'] as List).cast<Json>()) Padding(key: ObjectKey(m), padding: const EdgeInsets.only(bottom: 14), child: Column(children: [
            DropdownButtonFormField<String>(initialValue: available.any((a) => a['id'] == m['materialId']) ? str(m['materialId']) : null, isExpanded: true, decoration: const InputDecoration(labelText: 'الخامة', border: OutlineInputBorder()), items: available.where((a) => a['id'] == m['materialId'] || !(v['materials'] as List).any((other) => other['materialId'] == a['id'])).map((a) => DropdownMenuItem(value: str(a['id']), child: Text('${a['name']} (${a['unit']})', overflow: TextOverflow.ellipsis))).toList(), validator: (value) => value == null ? 'اختر خامة' : null, onChanged: (value) => setState(() => m['materialId'] = value)),
            const SizedBox(height: 12), field(m, 'quantity', 'الكمية لقطعة واحدة', number: true),
            if ((v['materials'] as List).length > 1) TextButton(onPressed: busy ? null : () => setState(() => (v['materials'] as List).remove(m)), child: const Text('حذف الخامة')),
          ])),
          if (variants.indexOf(v) > 0) TextButton(onPressed: busy ? null : () => setState(() => v['materials'] = (variants.first['materials'] as List).map((m) => <String, dynamic>{...json(m)}).toList()), child: const Text('نسخ خامات الحجم الأول ثم تعديل الكميات')),
          costPreview(v, available),
          TextButton.icon(onPressed: busy || (v['materials'] as List).length >= 30 ? null : () => setState(() => (v['materials'] as List).add(<String, dynamic>{'materialId': '', 'quantity': ''})), icon: const Icon(Icons.add), label: const Text('إضافة خامة')),
        ]))),
        const SizedBox(height: 16), OutlinedButton.icon(onPressed: busy || variants.length >= 20 ? null : () => setState(() => variants.add(blank())), icon: const Icon(Icons.add), label: const Text('إضافة حجم آخر')),
        ],
        if (step == 3) ...[
        Card(child: Padding(padding: const EdgeInsets.all(16), child: field(product, 'description', 'وصف العطر', required: false, lines: 5))),
        SwitchListTile(value: product['published'] == true, onChanged: busy ? null : (value) => setState(() => product['published'] = value), title: const Text('ظاهر للعملاء في المتجر')),
        SwitchListTile(value: product['featured'] == true, onChanged: busy ? null : (value) => setState(() => product['featured'] = value), title: const Text('منتج مميز في الرئيسية')),
        const Text('الوصفات والطلبات السابقة تظل محفوظة عند تعديل المنتج أو إزالة حجم.', style: TextStyle(color: appMuted)),
        ],
        if (step == 4) ...[
          Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(str(product['title']), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800)), Text(str(product['category'])), if ((product['images'] as List).isNotEmpty) Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Wrap(spacing: 12, runSpacing: 12, children: (product['images'] as List).map((url) => ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(str(url), width: 90, height: 110, fit: BoxFit.cover, errorBuilder: (context, failure, stack) => const SizedBox(width: 90, height: 110, child: Icon(Icons.broken_image_outlined))))).toList())), const SizedBox(height: 12), Text(str(product['description'])), Text(product['published'] == true ? 'سيظهر للعملاء' : 'مسودة غير منشورة')]))),
          for (final v in variants) Card(margin: const EdgeInsets.only(top: 16), child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${v['title']} · ${v['price']} جنيه', style: const TextStyle(fontWeight: FontWeight.w800)), for (final m in (v['materials'] as List).map(json)) Text('${available.where((a) => a['id'] == m['materialId']).map((a) => a['name']).join()} · ${m['quantity']}'), costPreview(v, available)]))),
          const SizedBox(height: 16), const Text('لم يُحفظ المنتج بعد. راجع التفاصيل ثم أكد الحفظ.'),
        ],
        const SizedBox(height: 24), Row(children: [if (step > 0) ...[OutlinedButton(onPressed: busy ? null : () => setState(() => step--), child: const Text('السابق')), const SizedBox(width: 12)], Expanded(child: FilledButton(key: ValueKey('step-action-$step'), onPressed: busy || (step >= 2 && available.isEmpty) ? null : step == 4 ? save : next, child: Text(busy ? 'جارٍ الحفظ…' : step == 4 ? 'تأكيد حفظ المنتج' : step == 3 ? 'معاينة المنتج' : 'التالي')))]),
        if (available.isEmpty) const Text('أضف خامات المخزون أولًا'),
      ]));
    }));
}
