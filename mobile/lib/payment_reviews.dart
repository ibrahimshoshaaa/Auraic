import 'package:flutter/material.dart';
import 'api.dart';

class PaymentReviewsPage extends StatefulWidget {
  const PaymentReviewsPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<PaymentReviewsPage> createState() => _PaymentReviewsPageState();
}
class _PaymentReviewsPageState extends State<PaymentReviewsPage> {
  late Future<dynamic> result = widget.api.get('/api/payments/review');
  void refresh() => setState(() => result = widget.api.get('/api/payments/review'));
  Future<void> decide(String id, String decision) async {
    final confirmed = await showDialog<bool>(context: context, builder: (context) =>
      AlertDialog(title: Text(decision == 'APPROVED' ? 'تأكيد استلام التحويل؟' : 'رفض التحويل؟'),
        content: const Text('تأكد من وصول المبلغ فعليًا إلى الحساب قبل التأكيد.'),
        actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('إلغاء')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('تأكيد'))]));
    if (confirmed != true) return;
    try {
      await widget.api.post('/api/payments/review', {'orderId': id, 'decision': decision});
      refresh();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('مراجعة التحويلات'),
    actions: [IconButton(onPressed: refresh, icon: const Icon(Icons.refresh))]),
    body: FutureBuilder<dynamic>(future: result, builder: (context, snapshot) {
      if (snapshot.hasError) return Center(child: Text('تعذر تحميل التحويلات: ' + snapshot.error.toString()));
      if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
      final payments = (snapshot.data['data'] as List);
      if (payments.isEmpty) return const Center(child: Text('لا توجد تحويلات'));
      return ListView.builder(itemCount: payments.length, itemBuilder: (context, index) {
        final p = payments[index] as Map;
        return Card(margin: const EdgeInsets.all(10), child: Padding(padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('طلب ' + p['orderNumber'].toString() + ' — ' + p['customerRef'].toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(p['method'].toString() + ' · ' + p['plan'].toString() + ' · ' + p['review'].toString()),
            Text('المبلغ: ' + p['requestedAmount'].toString() + ' EGP'),
            Text('مرجع التحويل: ' + p['reference'].toString()),
            if (p['review'] == 'PENDING') Row(children: [
              FilledButton(onPressed: () => decide(p['id'].toString(), 'APPROVED'), child: const Text('تأكيد الوصول')),
              const SizedBox(width: 8),
              OutlinedButton(onPressed: () => decide(p['id'].toString(), 'REJECTED'), child: const Text('رفض')),
            ]),
          ])));
      });
    }));
}
