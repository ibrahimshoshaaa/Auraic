import 'package:flutter/material.dart';
import 'api.dart';
import 'ui.dart';
class ReturnWarning extends StatelessWidget {
  const ReturnWarning({required this.api, required this.orderId, required this.count, required this.onOpenOrder, super.key});
  final ErpApi api;
  final String orderId;
  final int count;
  final ValueChanged<String> onOpenOrder;
  @override
  Widget build(BuildContext context) => Container(margin: const EdgeInsets.symmetric(vertical: 10), padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: const Color(0xfffff6df), border: Border.all(color: const Color(0xffe7c76d)), borderRadius: BorderRadius.circular(12)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('تنبيه: الرقم ده مرتبط بـ $count طلب مرتجع سابق', style: const TextStyle(color: Color(0xff744f0c), fontSize: 12, fontWeight: FontWeight.w700)),
      const Text('راجع السجل قبل تأكيد الطلب. سبب الإرجاع غير مسجل.', style: TextStyle(fontSize: 11)),
      TextButton(onPressed: () => openPage(context, Scaffold(appBar: AppBar(title: const Text('الطلبات المرتجعة السابقة')), body: ReturnHistoryPage(api: api, orderId: orderId, onOpenOrder: onOpenOrder))), child: const Text('عرض الطلبات المرتجعة السابقة')),
    ]));
}
class ReturnHistoryPage extends StatefulWidget {
  const ReturnHistoryPage({required this.api, required this.orderId, required this.onOpenOrder, super.key});
  final ErpApi api;
  final String orderId;
  final ValueChanged<String> onOpenOrder;
  @override
  State<ReturnHistoryPage> createState() => _ReturnHistoryPageState();
}
class _ReturnHistoryPageState extends State<ReturnHistoryPage> {
  late Future<dynamic> result = widget.api.get('/api/orders/${Uri.encodeComponent(widget.orderId)}/return-history');
  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(future: result, builder: (context, snapshot) {
    if (snapshot.hasError) return Center(child: TextButton(onPressed: () => setState(() { result = widget.api.get('/api/orders/${Uri.encodeComponent(widget.orderId)}/return-history'); }), child: Text('${snapshot.error} · إعادة المحاولة')));
    if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
    final entries = (snapshot.data['data'] as List).map(json).toList();
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text('${entries.length} طلب مرتجع سابق لنفس الرقم'),
      for (final entry in entries) Card(child: ListTile(title: Text('طلب #${entry['number']}'),
        subtitle: Text('${entry['dateLabel'] ?? str(entry['date']).split('T').first} · ${entry['total']} ${entry['currency']} · تم الإرجاع'),
        trailing: const Icon(Icons.chevron_left), onTap: () { Navigator.pop(context); widget.onOpenOrder(str(entry['id'])); })),
    ]);
  });
}
