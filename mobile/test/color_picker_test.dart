import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/color_picker.dart';

void main() {
  testWidgets('Color choice applies without typing a HEX code and cancellation preserves it', (tester) async {
    String? result;
    await tester.pumpWidget(MaterialApp(home: Builder(builder: (context) => Scaffold(body: TextButton(
      onPressed: () async { result = await pickColor(context, label: 'لون الخلفية', initial: Colors.white); },
      child: const Text('فتح الألوان'))))));
    await tester.tap(find.text('فتح الألوان')); await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('swatch-#3F3A60'))); await tester.pumpAndSettle();
    await tester.tap(find.text('اختيار اللون')); await tester.pumpAndSettle();
    expect(result, '#3F3A60');
    await tester.tap(find.text('فتح الألوان')); await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('swatch-#000000'))); await tester.pumpAndSettle();
    await tester.tap(find.text('إلغاء')); await tester.pumpAndSettle();
    expect(result, isNull);
  });
}
