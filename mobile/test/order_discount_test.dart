import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/orders.dart';

class DiscountApi extends ErpApi {
  Map<String, dynamic>? saved;
  @override
  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    expect(path, '/api/orders/web_friend/discount');
    saved = body;
    return {};
  }
}
void main() {
  testWidgets('admin previews remaining collection and saves discount with order version', (tester) async {
    final api = DiscountApi();
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: OrderDiscountDialog(api: api, order: {
      'id': 'web_friend', 'total': 1000, 'depositAmount': 150, 'adminDiscount': 0, 'updatedAt': '2026-10-12T19:00:00.000Z',
    }))));
    await tester.enterText(find.byType(TextField), '100');
    await tester.pump();
    expect(find.text('الإجمالي بعد الخصم: 900.00 EGP'), findsOneWidget);
    expect(find.text('المطلوب تحصيله: 750.00 EGP'), findsOneWidget);
    await tester.tap(find.text('حفظ الخصم'));
    await tester.pumpAndSettle();
    expect(api.saved?['amount'], 100);
    expect(api.saved?['updatedAt'], '2026-10-12T19:00:00.000Z');
  });
}
