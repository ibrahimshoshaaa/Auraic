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
 test('Separates products from shipping and preserves discounts and free shipping', () {
  final order = <String, dynamic>{'customerPhone': '01012345678', 'subtotal': '450', 'shipping': '60', 'total': '510', 'currency': 'EGP', 'items': []};
  String message(Map<String, dynamic> data) => Uri.parse(orderWhatsAppUrl(data)!).queryParameters['text']!;
  final text = message(order);
  for (final line in ['قيمة المنتجات: 450 EGP', 'الشحن: 60 EGP', 'الإجمالي شامل الشحن: 510 EGP']) {
    expect(text, contains(line));
  }
  final discounted = message({...order, 'discount': '45', 'total': '465'});
  expect(discounted, contains('الخصم: 45 EGP'));
  expect(discounted, contains('الإجمالي شامل الشحن: 465 EGP'));
  final free = message({...order, 'shipping': 0, 'total': 450});
  expect(free, contains('الشحن: 0 EGP'));
  expect(free, contains('الإجمالي شامل الشحن: 450 EGP'));
 });
}
