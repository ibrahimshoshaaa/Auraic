import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/orders.dart';
class OrderApi extends ErpApi {
 String status = 'NEW';
 int updates = 0;
 @override
 Future<dynamic> get(String path) async => {'data': [{'id': 'web_order', 'orderNumber': 'A-123', 'manualStatus': status, 'customerRef': 'إبراهيم', 'customerPhone': '01012345678', 'currency': 'EGP', 'total': 450, 'items': [{'title': 'No. 28 · 30 ml', 'quantity': 1}]}], 'count': 1, 'hasMore': false};
 @override
 Future<dynamic> post(String path, Map<String, dynamic> body) async { updates++; status = body['status'] as String; return {}; }
}
void main() {
 testWidgets('next action is usable without expanding order and refreshes after confirmation', (tester) async {
  tester.view.physicalSize = const Size(900, 2000); tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
  final api = OrderApi();
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: OrdersPage(api: api, canWrite: true))));
  await tester.pumpAndSettle();
  expect(find.text('بيانات العميل'), findsNothing);
  await tester.tap(find.text('تم التجهيز'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('تأكيد', skipOffstage: true));
  await tester.pumpAndSettle();
  expect(api.updates, 1); expect(api.status, 'PREPARED');
  expect(find.text('جاري الشحن'), findsOneWidget);
  expect(find.text('بيانات العميل'), findsNothing);
  await tester.tap(find.text('طلب #A-123'));
  await tester.pumpAndSettle();
  expect(find.byTooltip('تأكيد الطلب عبر واتساب'), findsOneWidget);
 });
}
