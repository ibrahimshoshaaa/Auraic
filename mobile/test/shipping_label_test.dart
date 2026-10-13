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
      expect(find.text('Auraic'), findsNothing);
      expect(find.text('01012345678'), findsOneWidget);
      expect(find.text('410 EGP'), findsOneWidget);
      expect(tester.getSize(find.text('01012345678')).width, 189);
      final phone = tester.widget<Text>(find.text('01012345678'));
      expect(phone.style!.fontWeight, FontWeight.w800);
      final total = tester.widget<Text>(find.text('410 EGP'));
      expect(total.style!.fontSize, greaterThan(phone.style!.fontSize!));
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
