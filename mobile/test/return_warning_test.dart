import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/return_warning.dart';
class HistoryApi extends ErpApi {
  String? path;
  @override
  Future<dynamic> get(String value) async { path = value; return {'data': [{'id':'old', 'number':'R100', 'date':'2026-10-01T00:00:00Z', 'total':100, 'currency':'EGP'}]}; }
}
void main() {
  testWidgets('return warning is visible and opens prior order history', (tester) async {
    final api = HistoryApi(); String? opened;
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: ReturnWarning(api: api, orderId: 'new', count: 1, onOpenOrder: (id) { opened = id; }))));
    expect(find.textContaining('1 طلب مرتجع سابق'), findsOneWidget);
    await tester.tap(find.text('عرض الطلبات المرتجعة السابقة')); await tester.pumpAndSettle();
    expect(api.path, '/api/orders/new/return-history'); expect(find.text('طلب #R100'), findsOneWidget);
    await tester.tap(find.text('طلب #R100')); await tester.pumpAndSettle(); expect(opened, 'old');
    expect(tester.takeException(), isNull);
  });
}
