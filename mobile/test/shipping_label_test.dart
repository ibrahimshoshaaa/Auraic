import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/shipping_label.dart';
void main() {
  testWidgets('label uses full width without branding and fits long addresses', (tester) async {
    for (final count in [1, 12]) {
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: Align(alignment: Alignment.topRight,
        child: SizedBox(width: 189, height: 264.6, child: ShippingLabelContent(order: {
          'orderNumber': 'AU-1234', 'customerRef': 'إبراهيم محمد', 'customerPhone': '01012345678',
          'customerAddress': List.filled(count, 'القاهرة، مدينة نصر، شارع عباس العقاد، الدور الثالث').join(' '),
          'total': 510, 'depositAmount': 100, 'currency': 'EGP',
          'items': List.generate(count, (i) => {'title': 'عطر أورايك ٥٠ مل', 'quantity': 2}),
        }))))));
      expect(tester.takeException(), isNull);
      final content = find.byType(ShippingLabelContent);
      expect(tester.getSize(content), const Size(189, 264.6));
      final painted = tester.widget<CustomPaint>(find.descendant(of: content, matching: find.byType(CustomPaint)));
      final painter = painted.painter! as ShippingLabelPainter;
      final text = painter.rows.map((row) => row.text ?? '').join(' ');
      expect(text.contains('Auraic'), isFalse);
      expect(text.contains('01012345678'), isTrue);
      expect(text.contains('410 EGP'), isTrue);
      final layout = painter.layout(const Size(189, 264.6));
      expect(layout.first.top, 0);
      expect(layout.last.top + layout.last.height, closeTo(264.6, 0.01));
      for (final line in layout) {
        expect(line.top + line.height, lessThanOrEqualTo(264.61));
      }
      expect(painter.rows[2].bold, isTrue);
      expect(painter.rows.last.size, greaterThan(painter.rows[2].size));
    }
  });
  test('collection includes shipping, subtracts deposit and excludes paid orders', () {
    final order = <String, dynamic>{'total': '510', 'shipping': '60', 'depositAmount': '100', 'manualStatus': 'SHIPPING', 'financialStatus': 'PARTIALLY_PAID'};
    expect(shippingCollection(order), 410);
    expect(shippingCollection({...order, 'depositAmount': 0}), 510);
    expect(shippingCollection({...order, 'total': 390}), 290);
    expect(shippingCollection({...order, 'depositAmount': 600}), 0);
    expect(shippingCollection({...order, 'manualStatus': 'DELIVERED'}), 0);
    expect(shippingCollection({...order, 'manualStatus': 'RETURNED'}), 0);
    expect(shippingCollection({...order, 'financialStatus': 'PAID'}), 0);
  });
}
