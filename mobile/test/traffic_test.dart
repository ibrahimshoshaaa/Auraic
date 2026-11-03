import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/traffic.dart';

class TrafficApi extends ErpApi {
  final paths = <String>[];
  bool fail = false;
  @override
  Future<dynamic> get(String path) async {
    paths.add(path);
    if (fail) throw const ApiException('غير مسموح بعرض إحصائيات الزيارات', 403);
    return {'data': {
      'visits': 4, 'views': 9, 'averageDepth': 2.25, 'checkoutShare': 25,
      'active': 1, 'singlePage': 2, 'comparable': false,
      'display': {'from':'١ نوفمبر', 'to':'٣ نوفمبر', 'updatedAt':'٣ نوفمبر', 'lastVisit':'٣ نوفمبر'},
      'peak': {'label':'٣ نوفمبر','views':9},
      'points': [{'key':'one','label':'٢ نوفمبر','shortLabel':'٢/١١','visits':1,'views':2}, {'key':'two','label':'٣ نوفمبر','shortLabel':'٣/١١','visits':3,'views':7}],
      'stages': [{'label':'فتح إتمام الطلب','count':1}],
      'pages': [{'path':'/products/no4','label':'No.4','views':6,'visits':3,'share':66.7,'lastSeenLabel':'٣ نوفمبر'}],
    }};
  }
}
void main() {
  testWidgets('native traffic report loads, filters and renders on narrow screens', (tester) async {
    tester.view.physicalSize = const Size(390, 844); tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize); addTearDown(tester.view.resetDevicePixelRatio);
    final api = TrafficApi();
    await tester.pumpWidget(MaterialApp(home: Directionality(textDirection: TextDirection.rtl, child: Scaffold(body: TrafficPage(api: api)))));
    await tester.pumpAndSettle();
    expect(api.paths, ['/api/reports/traffic?days=7']);
    expect(find.text('المقارنة عند اكتمال فترة سابقة محفوظة'), findsNWidgets(2));
    expect(find.text('2.3'), findsOneWidget); expect(find.text('No.4'), findsOneWidget);
    await tester.ensureVisible(find.widgetWithText(ChoiceChip, '٢٤ ساعة'));
    await tester.tap(find.widgetWithText(ChoiceChip, '٢٤ ساعة')); await tester.pumpAndSettle();
    expect(api.paths.last, '/api/reports/traffic?days=1');
    expect(find.text('حركة الزيارات بالساعات'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('traffic chart switches metrics and selects a point', (tester) async {
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SizedBox(width:390, child: TrafficBars(points: [
      {'label':'اليوم الأول','shortLabel':'١','visits':1,'views':2},
      {'label':'اليوم الثاني','shortLabel':'٢','visits':3,'views':7},
    ])))));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ChoiceChip, 'المشاهدات')); await tester.pumpAndSettle();
    await tester.tap(find.text('١')); await tester.pumpAndSettle();
    expect(find.text('اليوم الأول · 1 زيارة · 2 مشاهدة'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('authorization failure is shown with retry instead of fake totals', (tester) async {
    final api = TrafficApi()..fail = true;
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: TrafficPage(api: api)))); await tester.pumpAndSettle();
    expect(find.text('غير مسموح بعرض إحصائيات الزيارات'), findsOneWidget);
    api.fail = false; await tester.tap(find.text('إعادة المحاولة')); await tester.pumpAndSettle();
    expect(find.text('مشاهدات الصفحات'), findsOneWidget); expect(api.paths.length, 2);
  });
}
