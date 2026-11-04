import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/report_exports.dart';
class ExportApi extends ErpApi {
  final paths = <String>[];
  bool fail = false;
  @override
  Future<Uint8List> download(String path) async { paths.add(path); if (fail) throw const ApiException('غير مسموح', 403); return Uint8List.fromList([1, 2, 3]); }
}
void main() {
  testWidgets('exports both formats with exact displayed period and shares real bytes', (tester) async {
    final api = ExportApi(); final names = <String>[];
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: ReportExportButtons(api: api, period: 'custom', from: '2026-10-01', to: '2026-10-31', share: (bytes, name, mime, origin) async { expect(bytes, [1, 2, 3]); names.add(name); }))));
    await tester.tap(find.text('تصدير Excel')); await tester.pumpAndSettle();
    expect(api.paths.single, '/api/reports/export?format=xlsx&period=custom&from=2026-10-01&to=2026-10-31');
    expect(names.single, 'auraic-report-2026-10-01-2026-10-31.xlsx');
    await tester.tap(find.text('تصدير PDF')); await tester.pumpAndSettle(); expect(names.last.endsWith('.pdf'), true);
    api.fail = true; await tester.tap(find.text('تصدير Excel')); await tester.pumpAndSettle(); expect(find.text('غير مسموح'), findsOneWidget); expect(names.length, 2);
  });
}
