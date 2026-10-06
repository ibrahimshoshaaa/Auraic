import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/shipping_label.dart';
void main() {
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
