import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api.dart';
import 'orders.dart';
import 'ui.dart';

String customerMoney(dynamic cents, String currency) => '${((num.tryParse('$cents') ?? 0) / 100).toStringAsFixed(2)} $currency';
String customerDate(dynamic value) {
  final date = DateTime.tryParse(str(value));
  return date == null ? 'غير متاح' : '${date.day}/${date.month}/${date.year}';
}
class CustomersPage extends StatefulWidget {
  const CustomersPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<CustomersPage> createState() => _CustomersPageState();
}
class _CustomersPageState extends State<CustomersPage> {
  final search = TextEditingController();
  String query = '';
  String sort = 'recent';
  int page = 1;
  late Future<dynamic> result = load();
  Future<dynamic> load() => widget.api.get('/api/customers?q=${Uri.encodeComponent(query)}&sort=$sort&page=$page');
  void reload() => setState(() => result = load());
  @override
  void dispose() { search.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async { reload(); await result; },
    child: ListView(padding: const EdgeInsets.all(16), children: [
      const PageIntro(title: 'العملاء', subtitle: 'بيانات التواصل وسجل طلبات المتجر والمحل', icon: Icons.people_outline),
      const SizedBox(height: 18),
      TextField(controller: search, onSubmitted: (_) { query = search.text; page = 1; reload(); },
        decoration: InputDecoration(hintText: 'الاسم، الهاتف أو العنوان', prefixIcon: const Icon(Icons.search),
          suffixIcon: IconButton(tooltip: 'بحث', icon: const Icon(Icons.arrow_back),
            onPressed: () { query = search.text; page = 1; reload(); }))),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(initialValue: sort,
        decoration: const InputDecoration(labelText: 'ترتيب العملاء'),
        items: const [DropdownMenuItem(value: 'recent', child: Text('الأحدث نشاطًا')),
          DropdownMenuItem(value: 'orders', child: Text('الأكثر طلبًا')),
          DropdownMenuItem(value: 'spent', child: Text('الأعلى شراءً (EGP)'))],
        onChanged: (value) { sort = value ?? 'recent'; page = 1; reload(); }),
      const SizedBox(height: 18),
      FutureBuilder<dynamic>(future: result, builder: (context, snapshot) {
        if (snapshot.hasError) return TextButton(onPressed: reload, child: Text('${snapshot.error} · إعادة المحاولة'));
        if (!snapshot.hasData) return const PageSkeleton(embedded: true);
        final data = json(snapshot.data);
        final stats = json(data['stats']);
        final customers = (data['data'] as List).map(json).toList();
        return Column(children: [
          Card(color: appNavy, child: Padding(padding: const EdgeInsets.all(20),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text('${stats['total']} عميل · ${stats['repeat']} متكرر', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              const Text('صافي قيمة الطلبات المسلّمة بعد رد المبالغ', style: TextStyle(color: Colors.white70)),
              for (final entry in json(stats['delivered']).entries)
                Text(customerMoney(entry.value, entry.key), textDirection: TextDirection.ltr, style: const TextStyle(color: Colors.white, fontSize: 20)),
              const SizedBox(height: 10),
              Text('${stats['unidentified']} بدون رقم موثوق — كل طلب مستقل', style: const TextStyle(color: Colors.white70, fontSize: 12)),
            ]))),
          const SizedBox(height: 16),
          if (customers.isEmpty) const Padding(padding: EdgeInsets.all(30), child: Text('لا يوجد عملاء بهذا البحث. يُضاف العميل تلقائيًا مع أول طلب.')),
          for (final customer in customers) Padding(padding: const EdgeInsets.only(bottom: 12),
            child: Card(child: ListTile(contentPadding: const EdgeInsets.all(16),
              leading: const CircleAvatar(child: Icon(Icons.person_outline)),
              title: Text(str(customer['name']), style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Padding(padding: const EdgeInsets.only(top: 8), child: Text('${str(customer['phone']).isEmpty ? 'الهاتف غير متاح' : '+${customer['phone']}'}\n${customer['ordersCount']} طلب · آخر طلب ${customerDate(customer['lastOrderAt'])}')),
              trailing: const Icon(Icons.chevron_left), isThreeLine: true,
              onTap: () async { await openPage(context, CustomerDetailsPage(api: widget.api, customerKey: str(customer['key']))); if (mounted) reload(); }))),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            TextButton(onPressed: page <= 1 ? null : () { page--; reload(); }, child: const Text('السابق')),
            Text('${data['count']} نتيجة · صفحة $page'),
            TextButton(onPressed: page >= (data['pages'] as int) ? null : () { page++; reload(); }, child: const Text('التالي')),
          ]),
        ]);
      }),
    ]));
}
class CustomerDetailsPage extends StatefulWidget {
  const CustomerDetailsPage({required this.api, required this.customerKey, super.key});
  final ErpApi api;
  final String customerKey;
  @override
  State<CustomerDetailsPage> createState() => _CustomerDetailsPageState();
}
class _CustomerDetailsPageState extends State<CustomerDetailsPage> {
  int page = 1;
  late Future<dynamic> result = load();
  Future<dynamic> load() => widget.api.get('/api/customers?key=${Uri.encodeComponent(widget.customerKey)}&page=$page');
  void reload() => setState(() => result = load());
  Future<void> copy(String text) async {
    await Clipboard.setData(ClipboardData(text: text));
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تم النسخ')));
  }
  Future<void> launch(String value) async {
    try {
      if (!await launchUrl(Uri.parse(value), mode: LaunchMode.externalApplication)) throw Exception();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر فتح التطبيق؛ يمكنك نسخ الهاتف')));
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('ملف العميل')),
    body: FutureBuilder<dynamic>(future: result, builder: (context, snapshot) {
      if (snapshot.hasError) return Center(child: TextButton(onPressed: reload, child: Text('${snapshot.error} · إعادة المحاولة')));
      if (!snapshot.hasData) return const PageSkeleton();
      final response = json(snapshot.data);
      final c = json(response['data']);
      final phone = str(c['phone']); final address = str(c['address']);
      return RefreshIndicator(onRefresh: () async { reload(); await result; }, child: ListView(padding: const EdgeInsets.all(16), children: [
        Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(str(c['name']), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12), SelectableText(phone.isEmpty ? 'الهاتف غير متاح' : '+$phone', textDirection: TextDirection.ltr),
          const SizedBox(height: 12), SelectableText(address.isEmpty ? 'العنوان غير متاح' : address),
          const SizedBox(height: 12), Text('أول طلب ${customerDate(c['firstOrderAt'])} · آخر طلب ${customerDate(c['lastOrderAt'])}'),
          const SizedBox(height: 12), Wrap(spacing: 8, runSpacing: 8, children: [
            if (phone.isNotEmpty) ...[
              OutlinedButton.icon(onPressed: () => launch('tel:+$phone'), icon: const Icon(Icons.phone_outlined), label: const Text('اتصال')),
              OutlinedButton(onPressed: () => launch('https://wa.me/$phone'), child: const Text('واتساب')),
              OutlinedButton(onPressed: () => copy('+$phone'), child: const Text('نسخ الهاتف')),
            ],
            if (address.isNotEmpty) OutlinedButton(onPressed: () => copy(address), child: const Text('نسخ العنوان')),
          ]),
          if (phone.isNotEmpty && address.isNotEmpty) FilledButton.icon(onPressed: () async {
            await openPage(context, NewOrderPage(api: widget.api, customer: c)); if (mounted) reload();
          }, icon: const Icon(Icons.add), label: const Text('طلب جديد للعميل')),
        ]))),
        const SizedBox(height: 12),
        Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('${c['ordersCount']} طلب · ${c['deliveredCount']} مسلّم · ${c['returnedCount']} مرتجع'),
          for (final entry in json(c['totals']).entries) ...[
            const Divider(height: 24),
            Text('قيمة كل الطلبات: ${customerMoney(json(entry.value)['orderValue'], entry.key)}'),
            Text('صافي المسلّم: ${customerMoney(json(entry.value)['deliveredValue'], entry.key)}'),
            Text('مبالغ مستردة: ${customerMoney(json(entry.value)['refundedValue'], entry.key)}'),
          ],
        ]))),
        const SizedBox(height: 20), const Text('سجل الطلبات', style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        for (final o in (c['orders'] as List).map(json)) Padding(padding: const EdgeInsets.only(bottom: 12), child: Card(child: ExpansionTile(
          title: Text('طلب #${str(o['orderNumber'] ?? str(o['id']).split('_').last).replaceAll('#', '')}'),
          subtitle: Text('${orderStages[o['manualStatus']] ?? 'غير محدد'} · ${customerDate(o['occurredAt'])}\n${o['total']} ${o['currency']}'),
          children: [
            ListTile(title: Text(paymentStages[o['financialStatus']] ?? 'دفع غير محدد'), subtitle: Text(str(o['customerAddress']))),
            for (final item in (o['items'] as List).map(json)) ListTile(title: Text(str(item['title'])), trailing: Text('× ${item['quantity']}')),
            for (final r in (o['returns'] as List).map(json)) ListTile(leading: const Icon(Icons.undo), title: Text('مرتجع ${r['totalAmount'] ?? 0} ${o['currency']}'), subtitle: Text('تكلفة المرتجع ${r['returnCost']} ${o['currency']}')),
            TextButton(onPressed: () => openPage(context, Scaffold(appBar: AppBar(title: const Text('تفاصيل الطلب')), body: OrdersPage(api: widget.api, canWrite: true, orderId: str(o['id'])))), child: const Text('فتح الطلب وإدارته')),
          ]))),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          TextButton(onPressed: page <= 1 ? null : () { page--; reload(); }, child: const Text('السابق')),
          Text('صفحة $page'),
          TextButton(onPressed: page >= (response['pages'] as int) ? null : () { page++; reload(); }, child: const Text('التالي')),
        ]),
      ]));
    }));
}
