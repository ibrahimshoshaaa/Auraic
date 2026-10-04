import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/recipe_picker.dart';
import 'package:perfume_erp/ui.dart';
void main() {
  for (final unit in ['ml', 'مل']) {
  testWidgets('recipe $unit uses material buttons and quantity presets without duplicate lines', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    List<Json> lines = [];
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child: StatefulBuilder(builder: (context, setState) => RecipePicker(materials: [
      {'id':'oil','name':'زيت عود','unit':unit,'materialType':{'name':'زيوت'}},
      {'id':'bottle','name':'زجاجة 30','unit':'piece','materialType':{'name':'زجاجات'}},
    ], lines: lines, onChanged: (value) => setState(() => lines = value)))))));
    await tester.pumpAndSettle();
    await tester.tap(find.text('زيت عود · $unit'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('30 $unit'));
    await tester.tap(find.text('30 $unit'));
    await tester.pumpAndSettle();
    for (final amount in [5, 10, 15, 20, 25, 30]) { expect(find.widgetWithText(ChoiceChip, '$amount $unit'), findsOneWidget); }
    expect(find.text('2 $unit'), findsNothing);
    expect(lines, [{'materialId':'oil','quantity':30.0}]);
    await tester.ensureVisible(find.text('زجاجة 30 · piece'));
    await tester.tap(find.text('زجاجة 30 · piece'));
    await tester.pumpAndSettle();
    expect(lines.length,2);
    expect(lines.last['quantity'],1);
    await tester.tap(find.text('زجاجة 30 · piece'));
    await tester.pumpAndSettle();
    expect(lines, [{'materialId':'oil','quantity':30.0}]);
  });
  }
}
