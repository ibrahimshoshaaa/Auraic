import 'package:flutter/material.dart';
import 'api.dart';
import 'package:url_launcher/url_launcher.dart';

class PaymentReviewsPage extends StatefulWidget {
  const PaymentReviewsPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<PaymentReviewsPage> createState() => _PaymentReviewsPageState();
}
class _PaymentReviewsPageState extends State<PaymentReviewsPage> {
  late Future<dynamic> result = widget.api.get('/api/payments/review');
  late Future<dynamic> refundsResult = widget.api.get('/api/payments/refunds');
  void refresh() => setState(() {
    result = widget.api.get('/api/payments/review');
    refundsResult = widget.api.get('/api/payments/refunds');
  });
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
  Future<void> editDeposit() async {
    try {
      final response = await widget.api.get("/api/payments/deposit-settings");
      final data = response["data"] as Map;
      if (data["canEdit"] != true) return;
      final controller = TextEditingController(text: data["depositAmount"].toString());
      final amount = await showDialog<int>(context: context, builder: (dialogContext) => AlertDialog(
        title: const Text("المقدم الثابت بالجنيه"),
        content: TextField(controller: controller, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: "مبلغ المقدم (EGP)")),
        actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text("إلغاء")),
          FilledButton(onPressed: () { final value = int.tryParse(controller.text.trim()); if (value != null && value >= 1 && value <= 1000000) Navigator.pop(dialogContext, value); }, child: const Text("حفظ"))]));
      controller.dispose();
      if (amount == null) return;
      await widget.api.put("/api/payments/deposit-settings", {"depositAmount": amount});
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("تم تحديث المقدم الثابت")));
    } catch (error) { if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString()))); }
  }
  Future<void> openReceipt(String id) async {
    try {
      final response = await widget.api.get("/api/payments/receipt?orderId=${Uri.encodeComponent(id)}");
      final url = Uri.parse(response["data"]["url"].toString());
      if (!await launchUrl(url, mode: LaunchMode.externalApplication)) throw Exception("تعذر فتح الإيصال");
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }
  Future<void> confirmRefund(String id) async {
    final controller = TextEditingController();
    final reference = await showDialog<String>(context: context, builder: (dialogContext) =>
      AlertDialog(title: const Text('تأكيد رد المبلغ'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('أكد فقط بعد إرسال المبلغ فعليًا للعميل.'),
          TextField(controller: controller, decoration: const InputDecoration(labelText: 'مرجع عملية رد المبلغ')),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('إلغاء')),
          FilledButton(onPressed: () {
            if (controller.text.trim().length >= 3) Navigator.pop(dialogContext, controller.text.trim());
          }, child: const Text('تأكيد الإرسال')),
        ]));
    controller.dispose();
    if (reference == null) return;
    try {
      await widget.api.post('/api/payments/refund-confirm', {'orderId': id, 'reference': reference});
      if (mounted) refresh();
    } catch (error) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('مراجعة التحويلات'),
    actions: [IconButton(tooltip: "تعديل المقدم الثابت", onPressed: editDeposit, icon: const Icon(Icons.payments_outlined)), IconButton(onPressed: refresh, icon: const Icon(Icons.refresh))]),
    body: FutureBuilder<dynamic>(future: result, builder: (context, snapshot) {
      if (snapshot.hasError) return Center(child: Text('تعذر تحميل التحويلات: ' + snapshot.error.toString()));
      if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
      final payments = (snapshot.data['data'] as List);
      return ListView(children: [
        const Padding(padding: EdgeInsets.all(12), child: Text('التحويلات الواردة', style: TextStyle(fontWeight: FontWeight.bold))),
        if (payments.isEmpty) const ListTile(title: Text('لا توجد تحويلات')),
        ...payments.map((entry) {
        final p = entry as Map;
        return Card(margin: const EdgeInsets.all(10), child: Padding(padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('طلب ' + p['orderNumber'].toString() + ' — ' + p['customerRef'].toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(p['method'].toString() + ' · ' + p['plan'].toString() + ' · ' + p['review'].toString()),
            Text('المبلغ: ' + p['requestedAmount'].toString() + ' EGP'),
            Text('مرجع التحويل: ' + p['reference'].toString()),
            if (p['hasReceipt'] == true) TextButton.icon(onPressed: () => openReceipt(p['id'].toString()), icon: const Icon(Icons.receipt_long), label: const Text('عرض صورة الإيصال')),
            if (p['review'] == 'PENDING') Row(children: [
              FilledButton(onPressed: () => decide(p['id'].toString(), 'APPROVED'), child: const Text('تأكيد الوصول')),
              const SizedBox(width: 8),
              OutlinedButton(onPressed: () => decide(p['id'].toString(), 'REJECTED'), child: const Text('رفض')),
            ]),
          ])));
      }),
      const Padding(padding: EdgeInsets.all(12), child: Text('الاستردادات المعلقة', style: TextStyle(fontWeight: FontWeight.bold))),
      FutureBuilder<dynamic>(future: refundsResult, builder: (context, refundSnapshot) {
        if (refundSnapshot.hasError) return ListTile(title: Text('تعذر تحميل الاستردادات: ' + refundSnapshot.error.toString()));
        if (!refundSnapshot.hasData) return const ListTile(title: Text('جاري تحميل الاستردادات'));
        final refunds = refundSnapshot.data['data'] as List;
        if (refunds.isEmpty) return const ListTile(title: Text('لا توجد استردادات معلقة'));
        return Column(children: refunds.map((entry) {
          final refund = entry as Map;
          return Card(margin: const EdgeInsets.all(10), child: ListTile(
            title: Text('طلب ' + refund['orderNumber'].toString() + ' — ' + refund['customerRef'].toString()),
            subtitle: Text('المبلغ: ' + refund['amount'].toString() + ' EGP'),
            trailing: TextButton(
              onPressed: (num.tryParse(refund['amount'].toString()) ?? 0) > 0
                ? () => confirmRefund(refund['id'].toString()) : null,
              child: const Text('تأكيد الرد'),
            ),
          ));
        }).toList());
      }),
      ]);
    }));
}
