import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/order_whatsapp.dart';
void main() {
 test('WhatsApp draft normalizes Egyptian phone and includes requested order confirmation', () {
  final order = <String, dynamic>{'customerPhone': '٠١٠٢٥٢٦٩٩٧٧', 'orderNumber': '#A-123', 'customerRef': 'إبراهيم', 'customerAddress': 'شما', 'currency': 'EGP', 'total': 1260, 'shipping': 60, 'depositAmount': 200, 'items': [{'title': 'No. 28 · 100 ml', 'quantity': 2}]};
  final url = Uri.parse(orderWhatsAppUrl(order)!);
  expect(url.path, '/201025269977');
  for (final part in ['#A-123', 'No. 28 · 100 ml × 2', '1260 EGP', '1060 EGP', 'شما', 'هل تحب تأكد الأوردر؟']) { expect(url.queryParameters['text'], contains(part)); }
  expect(orderWhatsAppUrl({...order, 'customerPhone': '123'}), isNull);
 });
}
