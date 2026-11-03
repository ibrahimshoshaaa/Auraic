import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/storefront.dart';
class PixelSettingsApi extends ErpApi {
  Map<String, dynamic>? saved;
  @override
  Future<dynamic> put(String path, Map<String, dynamic> body) async { saved = body; return {'data':{'saved':true}}; }
}
void main() {
  testWidgets('pixel IDs validate, trim and clear while preserving unrelated settings', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400); tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
    final api = PixelSettingsApi();
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child: StorefrontSettings(api: api, initial: {
      'enabled':true, 'heroImages':<String>[], 'heroTitle':'Keep this title',
      'heroMode':'images', 'heroInterval':6, 'shippingFee':60, 'freeShippingFrom':0,
      'metaPixelId':'1931487371567376','tiktokPixelId':'',
    })))));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('التسويق والبيكسلز')); await tester.tap(find.text('التسويق والبيكسلز')); await tester.pumpAndSettle();
    final meta = find.byKey(const ValueKey('metaPixelId'));
    final tiktok = find.byKey(const ValueKey('tiktokPixelId'));
    await tester.ensureVisible(meta); await tester.enterText(meta, '<script>');
    await tester.ensureVisible(find.text('حفظ تعديلات الموقع')); await tester.tap(find.text('حفظ تعديلات الموقع')); await tester.pumpAndSettle();
    expect(api.saved,isNull); expect(find.text('رقم البيكسل غير صحيح'),findsOneWidget);
    await tester.ensureVisible(meta); await tester.enterText(meta, ' 1931487371567376 ');
    await tester.ensureVisible(tiktok); await tester.enterText(tiktok, ' C123456789ABCDEFGHIJK ');
    await tester.ensureVisible(find.text('حفظ تعديلات الموقع')); await tester.tap(find.text('حفظ تعديلات الموقع')); await tester.pumpAndSettle();
    final saved = api.saved!['data'] as Map;
    expect(saved['metaPixelId'],'1931487371567376'); expect(saved['tiktokPixelId'],'C123456789ABCDEFGHIJK'); expect(saved['heroTitle'],'Keep this title');
    await tester.ensureVisible(meta); await tester.enterText(meta, ''); await tester.ensureVisible(tiktok); await tester.enterText(tiktok, '');
    await tester.ensureVisible(find.text('حفظ تعديلات الموقع')); await tester.tap(find.text('حفظ تعديلات الموقع')); await tester.pumpAndSettle();
    expect((api.saved!['data'] as Map)['metaPixelId'],''); expect((api.saved!['data'] as Map)['tiktokPixelId'],'');
  });
}
