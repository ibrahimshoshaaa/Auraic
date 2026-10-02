import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/storefront.dart';

class SettingsApi extends ErpApi {
  Map<String, dynamic>? saved;
  @override
  Future<dynamic> put(String path, Map<String, dynamic> body) async {
    saved = body;
    return {'data': {'saved': true}};
  }
}
void main() {
  testWidgets('province rates save overrides and retain contact details', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final api = SettingsApi();
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child: StorefrontSettings(api: api, initial: {
      'enabled': true, 'heroImages': <String>[], 'heroMode': 'images', 'heroInterval': 6,
      'whatsapp': '201025269977', 'shippingFee': 60, 'freeShippingFrom': 1200,
      'shippingRates': {'القاهرة': 60, 'أسوان': 90},
    })))));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('الشحن والسياسات'));
    await tester.tap(find.text('الشحن والسياسات'));
    await tester.pumpAndSettle();
    final cairo = find.byKey(const ValueKey('shipping-القاهرة'));
    await tester.ensureVisible(cairo);
    await tester.enterText(cairo, '90');
    final aswan = find.byKey(const ValueKey('shipping-أسوان'));
    await tester.ensureVisible(aswan);
    await tester.enterText(aswan, '');
    final giza = find.byKey(const ValueKey('shipping-الجيزة'));
    await tester.ensureVisible(giza);
    await tester.enterText(giza, '0');
    await tester.ensureVisible(find.text('حفظ تعديلات الموقع'));
    await tester.tap(find.text('حفظ تعديلات الموقع'));
    await tester.pumpAndSettle();
    final data = api.saved!['data'] as Map;
    expect(data['shippingRates'], {'القاهرة': 90.0, 'الجيزة': 0.0});
    expect(data['whatsapp'], '201025269977');
    expect(data['shippingFee'], 60);
  });
}
