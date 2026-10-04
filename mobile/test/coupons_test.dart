import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/coupons.dart';
class CouponApi extends ErpApi {
 Map<String, dynamic>? saved;
 @override
 Future<dynamic> post(String path, Map<String, dynamic> body) async { saved = body; return {'data': {'saved': true}}; }
}
void main() {
 testWidgets('mobile coupon editor saves matching web rules and normalized code', (tester) async {
  final api = CouponApi();
  await tester.pumpWidget(MaterialApp(home: CouponEditor(api: api, products: const [])));
  await tester.pumpAndSettle();
  Finder field(String label) => find.widgetWithText(TextFormField, label);
  await tester.enterText(field('كود الخصم'), ' auraic10 ');
  await tester.ensureVisible(field('الحد الأدنى للطلب (جنيه)'));
  await tester.enterText(field('الحد الأدنى للطلب (جنيه)'), '500');
  await tester.ensureVisible(field('عدد الاستخدامات · 0 = غير محدود'));
  await tester.enterText(field('عدد الاستخدامات · 0 = غير محدود'), '20');
  await tester.ensureVisible(find.text('شحن مجاني'));
  await tester.tap(find.text('شحن مجاني'));
  await tester.ensureVisible(find.text('حفظ الكوبون'));
  await tester.tap(find.text('حفظ الكوبون'));
  await tester.pumpAndSettle();
  expect(api.saved?['code'], 'AURAIC10');
  expect(api.saved?['minOrder'], 500);
  expect(api.saved?['maxUses'], 20);
  expect(api.saved?['freeShipping'], true);
  expect(api.saved?['maxDiscount'], null);
 });
}
