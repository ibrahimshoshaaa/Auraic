import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/main.dart';
import 'package:perfume_erp/ui.dart';

void main() {
  test('statistics omit zero fractions without losing real cents', () {
    expect(statistic(1200.0), '1200');
    expect(statistic(1200.50), '1200.5');
    expect(statistic(0.0), '0');
    expect(statistic(100.01), '100.01');
  });
  testWidgets('shows login form before authentication', (tester) async {
    await tester.pumpWidget(MaterialApp(home: LoginPage(api: ErpApi(), onLogin: () {})));
    expect(find.textContaining('Auraic'), findsOneWidget);
    expect(find.byWidgetPredicate((widget) => widget is Image &&
      widget.image is AssetImage &&
      (widget.image as AssetImage).assetName == 'assets/auraic-logo.jpg'), findsOneWidget);
    expect(find.text('تسجيل الدخول'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
  });
}
