String? orderWhatsAppUrl(Map<String, dynamic> order) {
  var phone = '${order['customerPhone'] ?? ''}'.replaceAllMapped(RegExp('[٠-٩]'), (match) => '${match[0]!.codeUnitAt(0) - 1632}').replaceAllMapped(RegExp('[۰-۹]'), (match) => '${match[0]!.codeUnitAt(0) - 1776}').replaceAll(RegExp(r'[^0-9]'), '');
  if (phone.startsWith('00')) phone = phone.substring(2);
  if (RegExp(r'^01[0125]\d{8}$').hasMatch(phone)) phone = '20${phone.substring(1)}';
  if (!RegExp(r'^[1-9]\d{6,14}$').hasMatch(phone)) return null;
  double amount(dynamic value) => double.tryParse('$value') ?? 0;
  String money(dynamic value) { final n = amount(value); return '${n == n.roundToDouble() ? n.toInt() : n} ${order['currency'] ?? 'EGP'}'; }
  final total = amount(order['total']); final deposit = amount(order['depositAmount']);
  final shipping = amount(order['shipping']);
  final discount = amount(order['discount']);
  final tax = amount(order['tax']);
  final subtotal = order['subtotal'] == null
    ? (total - shipping - tax + discount).clamp(0, double.infinity)
    : amount(order['subtotal']);
  final customer = '${order['customerRef'] ?? ''}'.trim(); final address = '${order['customerAddress'] ?? ''}'.trim();
  final message = ["أهلًا ${customer.isEmpty ? 'بحضرتك' : customer}، معاك Auraic 🌸", "تفاصيل طلبك #${'${order['orderNumber'] ?? order['id'] ?? ''}'.replaceFirst(RegExp(r'^#+'), '')}:", for (final item in (order['items'] as List? ?? [])) '• ${item['title']} × ${item['quantity']}', 'قيمة المنتجات: ${money(subtotal)}', if (discount > 0) 'الخصم: ${money(discount)}', 'الشحن: ${money(shipping)}', if (tax > 0) 'الضريبة: ${money(tax)}', 'الإجمالي شامل الشحن: ${money(total)}', if (deposit > 0) ...['الديبوزت المدفوع: ${money(deposit)}', 'المتبقي: ${money((total - deposit).clamp(0, double.infinity))}'], if (address.isNotEmpty) 'عنوان التوصيل: $address', 'هل تحب تأكد الأوردر؟'].join('\n');
  return Uri.https('wa.me', '/$phone', {'text': message}).toString();
}
