import 'package:flutter/material.dart';
import 'api.dart';
import 'ui.dart';

const couponScopes = {'ALL': 'كل المنتجات', 'FRAGRANCES': 'العطور فقط', 'SAMPLES': 'السامبلز فقط', 'MEN': 'رجالي', 'WOMEN': 'حريمي', 'UNISEX': 'للجنسين'};
class CouponsPage extends StatefulWidget {
  const CouponsPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<CouponsPage> createState() => _CouponsPageState();
}
class _CouponsPageState extends State<CouponsPage> {
  late Future<dynamic> result = widget.api.get('/api/admin/coupons');
  void reload() => setState(() => result = widget.api.get('/api/admin/coupons'));
  Future<void> edit(List<Json> products, [Json? coupon]) async {
    final saved = await Navigator.of(context).push<bool>(MaterialPageRoute(builder: (_) => CouponEditor(api: widget.api, products: products, coupon: coupon)));
    if (saved == true && mounted) reload();
  }
  Future<void> remove(Json coupon) async {
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(title: Text('حذف ${coupon['code']}؟'), content: const Text('الطلبات السابقة تحتفظ بكود الخصم وقيمته.'), actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')), TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('حذف'))]));
    if (confirmed != true) return;
    try { await widget.api.delete('/api/admin/coupons?id=${Uri.encodeComponent(str(coupon['id']))}'); if (mounted) reload(); } catch (e) { if (mounted) showMessage(context, '$e'); }
  }
  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(future: result, builder: (context, snapshot) {
    if (!snapshot.hasData) return snapshot.hasError ? Center(child: TextButton(onPressed: reload, child: Text('${snapshot.error} · إعادة المحاولة'))) : const PageSkeleton();
    final data = json(snapshot.data['data']); final coupons = (data['coupons'] as List).map(json).toList(); final products = (data['products'] as List).map(json).toList();
    return ListView(padding: const EdgeInsets.all(16), children: [const PageIntro(title: 'الكوبونات', subtitle: 'خصومات وشحن مجاني بشروط تحددها أنت', icon: Icons.local_offer_outlined), const SizedBox(height: 16), FilledButton.icon(onPressed: () => edit(products), icon: const Icon(Icons.add), label: const Text('كوبون جديد')), const SizedBox(height: 16), if (coupons.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(24), child: Text('أضف أول كوبون لعملائك.'))), ...coupons.map((c) {
      final end = DateTime.tryParse(str(c['expiresAt'])); final start = DateTime.tryParse(str(c['startsAt']));
      final state = c['active'] != true ? 'متوقف' : end != null && !end.isAfter(DateTime.now()) ? 'منتهي' : amount(c['maxUses']) > 0 && amount(c['usedCount']) >= amount(c['maxUses']) ? 'نفد' : start != null && start.isAfter(DateTime.now()) ? 'مجدول' : 'نشط';
      return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [Expanded(child: Text(str(c['code']), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold))), StatusPill(label: state)]), const SizedBox(height: 8), Text('${statistic(c['value'])}${c['type'] == 'percent' ? '%' : ' جنيه'}${c['freeShipping'] == true ? ' · شحن مجاني' : ''}'), Text('${couponScopes[c['scope']]} · حد أدنى ${statistic(c['minOrder'])} جنيه'), Text('الاستخدام: ${c['usedCount']} / ${amount(c['maxUses']) == 0 ? 'غير محدود' : c['maxUses']}'), if (end != null) Text('ينتهي: ${end.toLocal()}'), Row(children: [Expanded(child: OutlinedButton.icon(onPressed: () => edit(products, c), icon: const Icon(Icons.edit_outlined), label: const Text('تعديل'))), IconButton(onPressed: () => remove(c), tooltip: 'حذف الكوبون', icon: const Icon(Icons.delete_outline, color: Colors.red))])])));
    })]);
  });
}
class CouponEditor extends StatefulWidget {
  const CouponEditor({required this.api, required this.products, this.coupon, super.key});
  final ErpApi api; final List<Json> products; final Json? coupon;
  @override
  State<CouponEditor> createState() => _CouponEditorState();
}
class _CouponEditorState extends State<CouponEditor> {
  final formKey = GlobalKey<FormState>(); final fields = <String, TextEditingController>{};
  String type = 'percent', scope = 'ALL'; String? productId; bool active = true, freeShipping = false, busy = false; DateTime? startsAt, expiresAt;
  @override
  void initState() { super.initState(); final c = widget.coupon ?? {}; for (final key in ['code', 'value', 'minOrder', 'minItems', 'maxDiscount', 'maxUses']) { fields[key] = TextEditingController(text: c[key] == null ? (key == 'value' ? '10' : ['minOrder','minItems','maxUses'].contains(key) ? '0' : '') : statistic(c[key])); } type = str(c['type']).isEmpty ? 'percent' : str(c['type']); scope = str(c['scope']).isEmpty ? 'ALL' : str(c['scope']); productId = c['productId']; active = c['active'] != false; freeShipping = c['freeShipping'] == true; startsAt = DateTime.tryParse(str(c['startsAt']))?.toLocal(); expiresAt = DateTime.tryParse(str(c['expiresAt']))?.toLocal(); }
  @override
  void dispose() { for (final c in fields.values) { c.dispose(); } super.dispose(); }
  Future<void> date(bool end) async { final current = (end ? expiresAt : startsAt) ?? DateTime.now(); final day = await showDatePicker(context: context, initialDate: current, firstDate: DateTime(2020), lastDate: DateTime(2100)); if (day == null || !mounted) return; final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(current)); if (time == null || !mounted) return; setState(() { final value = DateTime(day.year, day.month, day.day, time.hour, time.minute); if (end) { expiresAt = value; } else { startsAt = value; } }); }
  Future<void> save() async { if (!formKey.currentState!.validate() || busy) return; setState(() => busy = true); try {
    final body = <String, dynamic>{'id': widget.coupon?['id'], 'code': fields['code']!.text.trim().toUpperCase(), 'type': type, 'scope': scope, 'productId': productId, 'active': active, 'freeShipping': freeShipping, 'startsAt': startsAt?.toUtc().toIso8601String(), 'expiresAt': expiresAt?.toUtc().toIso8601String()};
    for (final key in ['value', 'minOrder', 'minItems', 'maxDiscount', 'maxUses']) { body[key] = key == 'maxDiscount' && fields[key]!.text.isEmpty ? null : num.parse(fields[key]!.text); }
    if (widget.coupon == null) { await widget.api.post('/api/admin/coupons', body); } else { await widget.api.put('/api/admin/coupons', body); }
    if (mounted) Navigator.pop(context, true);
  } catch (e) { if (mounted) showMessage(context, '$e'); } finally { if (mounted) setState(() => busy = false); } }
  Widget numeric(String key, String label, {bool optional = false, bool integer = false}) => Padding(padding: const EdgeInsets.only(bottom: 16), child: TextFormField(controller: fields[key], decoration: InputDecoration(labelText: label), keyboardType: TextInputType.numberWithOptions(decimal: !integer), validator: (v) { if (optional && (v ?? '').isEmpty) return null; final n = num.tryParse(v ?? ''); return n == null || n < 0 || integer && n != n.round() ? 'اكتب كمية صحيحة' : null; }));
  @override
  Widget build(BuildContext context) => PopScope(canPop: !busy, child: Scaffold(appBar: AppBar(title: Text(widget.coupon == null ? 'كوبون جديد' : 'تعديل الكوبون')), bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: FilledButton(onPressed: busy ? null : save, child: Text(busy ? 'جارٍ الحفظ…' : 'حفظ الكوبون')))), body: Form(key: formKey, child: AbsorbPointer(absorbing: busy, child: ListView(padding: const EdgeInsets.all(16), children: [
    TextFormField(controller: fields['code'], textDirection: TextDirection.ltr, decoration: const InputDecoration(labelText: 'كود الخصم', hintText: 'AURAIC10'), validator: (v) => RegExp(r'^[A-Za-z0-9_-]{2,40}$').hasMatch((v ?? '').trim()) ? null : 'من 2 إلى 40 حرفًا إنجليزيًا أو رقمًا'), const SizedBox(height: 16),
    DropdownButtonFormField<String>(initialValue: type, decoration: const InputDecoration(labelText: 'نوع الخصم'), items: const [DropdownMenuItem(value: 'percent', child: Text('نسبة مئوية')), DropdownMenuItem(value: 'fixed', child: Text('مبلغ ثابت'))], onChanged: (v) => setState(() => type = v!)), const SizedBox(height: 16),
    numeric('value', 'قيمة الخصم'), numeric('minOrder', 'الحد الأدنى للطلب (جنيه)'), numeric('minItems', 'أقل عدد قطع مؤهلة', integer: true), numeric('maxDiscount', 'أقصى خصم (اختياري)', optional: true), numeric('maxUses', 'عدد الاستخدامات · 0 = غير محدود', integer: true),
    DropdownButtonFormField<String>(initialValue: scope, decoration: const InputDecoration(labelText: 'القسم'), items: couponScopes.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(), onChanged: (v) => setState(() => scope = v!)), const SizedBox(height: 16),
    DropdownButtonFormField<String>(initialValue: productId != null && widget.products.any((p) => p['id'] == productId) ? productId : '', isExpanded: true, decoration: const InputDecoration(labelText: 'منتج محدد (اختياري)'), items: [const DropdownMenuItem(value: '', child: Text('كل منتجات القسم')), ...widget.products.map((p) => DropdownMenuItem(value: str(p['id']), child: Text(str(p['title']), overflow: TextOverflow.ellipsis)))], onChanged: (v) => setState(() => productId = v == '' ? null : v)), const SizedBox(height: 16),
    for (final end in [false, true]) ListTile(contentPadding: EdgeInsets.zero, title: Text(end ? 'تاريخ الانتهاء' : 'تاريخ البداية'), subtitle: Text(str(end ? expiresAt : startsAt).isEmpty ? 'غير محدد' : str(end ? expiresAt : startsAt)), onTap: () => date(end), trailing: IconButton(tooltip: 'إزالة التاريخ', onPressed: () => setState(() { if (end) { expiresAt = null; } else { startsAt = null; } }), icon: const Icon(Icons.clear))),
    SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('شحن مجاني'), value: freeShipping, onChanged: (v) => setState(() => freeShipping = v)), SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('الكوبون نشط'), value: active, onChanged: (v) => setState(() => active = v)),
    const Text('الخصم على سعر البيع الحالي للمنتجات المؤهلة. كوبون واحد لكل طلب، وحد الشحن المجاني قبل الخصم.'), const SizedBox(height: 24),
  ])))));
}
