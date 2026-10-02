import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/storefront.dart';

class ProductApi extends ErpApi {
  int saves = 0;
  @override
  Future<dynamic> get(String path) async => path == '/api/materials'
    ? {'data': [{'id': 'oil', 'name': 'زيت', 'unit': 'ml', 'defaultCost': '10'}]}
    : {'data': {'title': 'عود', 'storefrontDescription': 'عطر عود', 'storefrontCategory': 'العطور', 'storefrontImages': <String>[], 'storefrontPublished': true, 'storefrontFeatured': false, 'variants': [{'id': 'size', 'active': true, 'title': '30 ml', 'price': '450', 'recipes': [{'versions': [{'items': [{'materialId': 'oil', 'quantity': '30'}]}]}]}]}};
  @override
  Future<dynamic> post(String path, Map<String, dynamic> body) async {
    saves++;
    throw const ApiException('test stops before navigation', 503);
  }
}
void main() {
  testWidgets('advancing product steps never saves; review requires explicit confirmation', (tester) async {
    final api = ProductApi();
    await tester.pumpWidget(MaterialApp(home: ProductManagePage(api: api, productId: 'product')));
    await tester.pumpAndSettle();
    for (var step = 0; step < 3; step++) {
      final next = find.text('التالي');
      await tester.ensureVisible(next);
      await tester.tap(next);
      await tester.pumpAndSettle();
      expect(api.saves, 0);
    }
    await tester.ensureVisible(find.text('معاينة المنتج'));
    await tester.tap(find.text('معاينة المنتج'));
    await tester.pumpAndSettle();
    expect(api.saves, 0);
    expect(find.textContaining('300.00 جنيه'), findsOneWidget);
    expect(find.textContaining('150.00 جنيه'), findsOneWidget);
    await tester.ensureVisible(find.text('تأكيد حفظ المنتج'));
    await tester.tap(find.text('تأكيد حفظ المنتج'));
    await tester.pumpAndSettle();
    expect(api.saves, 1);
  });
}
