import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/recipe_picker.dart';
import 'package:perfume_erp/ui.dart';
void main() {
  testWidgets('recipe uses material buttons and quantity presets without duplicate lines', (tester) async {
    tester.view.physicalSize = const Size(1000, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    List<Json> lines = [];
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child: StatefulBuilder(builder: (context, setState) => RecipePicker(materials: [
      {'id':'oil','name':'زيت عود','unit':'ml','materialType':{'name':'زيوت'}},
      {'id':'bottle','name':'زجاجة 30','unit':'piece','materialType':{'name':'زجاجات'}},
    ], lines: lines, onChanged: (value) => setState(() => lines = value)))))));
    await tester.pumpAndSettle();
    await tester.tap(find.text('زيت عود · ml'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('30 ml'));
    await tester.tap(find.text('30 ml'));
    await tester.pumpAndSettle();
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
