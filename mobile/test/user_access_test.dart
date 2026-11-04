import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/account.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/more.dart';

class ReadOnlyReportApi extends ErpApi {
  @override
  Future<dynamic> get(String path) async => {'data': {
    'range': {'period': '7d', 'from': '2026-11-01', 'to': '2026-11-04'},
    'sales': {'total': 300, 'net': 300, 'orders': 1}, 'cash': {},
    'returns': {}, 'products': <dynamic>[],
  }};
}
void main() {
  testWidgets('a new account starts empty and linked permissions stay visible to the admin', (tester) async {
    tester.view.physicalSize = const Size(600, 2200); tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(MaterialApp(home: UserAccessPage(api: ErpApi(), groups: const [
      {'label': 'اختبار', 'items': [['products.read', 'عرض المنتجات'], ['recipes.read', 'عرض الوصفات'], ['products.write', 'تعديل المنتجات']]},
    ], dependencies: const {'products.write': ['products.read', 'recipes.read']})));
    await tester.pumpAndSettle();
    expect(tester.widgetList<CheckboxListTile>(find.byType(CheckboxListTile)).every((tile) => tile.value == false), true);
    await tester.tap(find.text('تعديل المنتجات')); await tester.pumpAndSettle();
    expect(tester.widget<CheckboxListTile>(find.widgetWithText(CheckboxListTile, 'عرض المنتجات')).value, true);
    expect(tester.widget<CheckboxListTile>(find.widgetWithText(CheckboxListTile, 'عرض الوصفات')).value, true);
    await tester.tap(find.text('عرض الوصفات')); await tester.pumpAndSettle();
    expect(tester.widget<CheckboxListTile>(find.widgetWithText(CheckboxListTile, 'تعديل المنتجات')).value, false);
    expect(tester.widget<CheckboxListTile>(find.widgetWithText(CheckboxListTile, 'عرض المنتجات')).value, true);
  });
  testWidgets('restricted reports render safely without financial sections or export buttons', (tester) async {
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: ReportsPage(api: ReadOnlyReportApi()))));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('إجمالي المبيعات'), findsOneWidget);
    expect(find.text('الربح وROAS'), findsNothing);
    expect(find.text('المصروفات'), findsNothing);
    expect(find.text('استهلاك الخامات'), findsNothing);
    expect(find.text('تصدير PDF'), findsNothing);
    expect(find.text('تصدير Excel'), findsNothing);
  });
}
