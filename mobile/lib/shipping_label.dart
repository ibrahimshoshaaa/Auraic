import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

num shippingCollection(Map<String, dynamic> order) {
  num amount(dynamic value) => num.tryParse('$value') ?? 0;
  if (['DELIVERED', 'RETURNED'].contains(order['manualStatus']) || order['financialStatus'] == 'PAID') return 0;
  return ((amount(order['total']) - amount(order['depositAmount'])) * 100).round().clamp(0, 1 << 53) / 100;
}
class ShippingLabelPage extends StatefulWidget {
  const ShippingLabelPage({required this.order, super.key});
  final Map<String, dynamic> order;
  @override
  State<ShippingLabelPage> createState() => _ShippingLabelPageState();
}
class _ShippingLabelPageState extends State<ShippingLabelPage> {
  final receipt = GlobalKey();
  int width = 80;
  bool busy = false;
  num amount(dynamic v) => num.tryParse('$v') ?? 0;
  String money(num n) => '${n == n.round() ? n.toInt() : n.toStringAsFixed(2)} ${widget.order['currency'] ?? 'EGP'}';
  Future<Uint8List> document() async {
    await WidgetsBinding.instance.endOfFrame;
    final boundary = receipt.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 3);
    try {
      final bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!.buffer.asUint8List();
      final pageWidth = width * PdfPageFormat.mm;
      final format = PdfPageFormat(pageWidth, pageWidth * image.height / image.width, marginAll: 0);
      final doc = pw.Document();
      doc.addPage(pw.Page(pageFormat: format, margin: pw.EdgeInsets.zero,
        build: (_) => pw.Image(pw.MemoryImage(bytes), fit: pw.BoxFit.contain)));
      return doc.save();
    } finally { image.dispose(); }
  }
  Future<void> output(bool share) async {
    setState(() => busy = true);
    try {
      final bytes = await document();
      if (share) {
        await Printing.sharePdf(bytes: bytes, filename: 'auraic-shipping-label.pdf');
      } else {
        await Printing.layoutPdf(onLayout: (_) async => bytes, dynamicLayout: false,
          name: 'Auraic shipping label', format: PdfPageFormat(width * PdfPageFormat.mm, 200 * PdfPageFormat.mm));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر تجهيز البوليصة؛ جرّب مشاركة PDF أو تطبيق الطابعة')));
    } finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) {
    final o = widget.order;
    final total = amount(o['total']);
    final shipping = amount(o['shipping']);
    Widget line(String text, {bool bold = false, double size = 13}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 4), child: Text(text,
        style: TextStyle(color: Colors.black, fontSize: size, fontWeight: bold ? FontWeight.w800 : FontWeight.normal)));
    return Scaffold(appBar: AppBar(title: const Text('بوليصة الشحن')),
      body: SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(children: [
        Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
          DropdownButton<int>(value: width, onChanged: busy ? null : (value) => setState(() => width = value!),
            items: const [DropdownMenuItem(value: 80, child: Text('٨٠ مم')), DropdownMenuItem(value: 58, child: Text('٥٨ مم'))]),
          FilledButton.icon(onPressed: busy ? null : () => output(false), icon: const Icon(Icons.print_outlined), label: const Text('طباعة')),
          OutlinedButton.icon(onPressed: busy ? null : () => output(true), icon: const Icon(Icons.share_outlined), label: const Text('مشاركة PDF')),
        ]),
        const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('اختار الطابعة من نافذة أندرويد، أو شارك PDF مع تطبيق الطابعة.', textAlign: TextAlign.center)),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: RepaintBoundary(key: receipt,
          child: Container(width: width * 3.78, color: Colors.white, padding: const EdgeInsets.all(12),
            child: Directionality(textDirection: TextDirection.rtl, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Text('Auraic', textAlign: TextAlign.center, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.black)),
              line('بوليصة شحن', bold: true), const Divider(color: Colors.black),
              line('رقم الطلب: ${o['orderNumber'] ?? o['id'] ?? ''}', bold: true),
              line('العميل: ${o['customerRef'] ?? 'غير متاح'}'), line('الهاتف: ${o['customerPhone'] ?? 'غير متاح'}'),
              line('العنوان: ${o['customerAddress'] ?? 'غير متاح'}'), const Divider(color: Colors.black),
              line('المنتجات', bold: true),
              for (final item in (o['items'] as List? ?? [])) line('${item['title']} × ${item['quantity']}'),
              const Divider(color: Colors.black), line('قيمة الطلب بعد الخصم: ${money(total - shipping)}'),
              line('الشحن: ${money(shipping)}'), line('الإجمالي شامل الشحن: ${money(total)}'),
              if (amount(o['depositAmount']) > 0) line('الديبوزت المدفوع: ${money(amount(o['depositAmount']))}'),
              const Divider(color: Colors.black), line('المطلوب تحصيله: ${money(shippingCollection(o))}', bold: true, size: 17),
            ])),
          ))),
      ])));
  }
}
