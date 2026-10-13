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
  static const double labelWidth = 50;
  static const double labelHeight = 70;
  bool busy = false;
  Future<Uint8List> document() async {
    await WidgetsBinding.instance.endOfFrame;
    final boundary = receipt.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 3);
    try {
      final bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!.buffer.asUint8List();
      const format = PdfPageFormat(labelWidth * PdfPageFormat.mm, labelHeight * PdfPageFormat.mm, marginAll: 0);
      final doc = pw.Document();
      doc.addPage(pw.Page(pageFormat: format, margin: pw.EdgeInsets.zero,
        build: (_) => pw.Image(pw.MemoryImage(bytes), fit: pw.BoxFit.contain)));
      return await doc.save();
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
          name: 'Auraic shipping label', format: const PdfPageFormat(labelWidth * PdfPageFormat.mm, labelHeight * PdfPageFormat.mm));
      }
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر تجهيز البوليصة؛ جرّب مشاركة PDF أو تطبيق الطابعة')));
    } finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(appBar: AppBar(title: const Text('استيكر الطلب')),
      body: SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(children: [
        Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
          const Text('٥ × ٧ سم'),
          FilledButton.icon(onPressed: busy ? null : () => output(false), icon: const Icon(Icons.print_outlined), label: const Text('طباعة')),
          OutlinedButton.icon(onPressed: busy ? null : () => output(true), icon: const Icon(Icons.share_outlined), label: const Text('مشاركة PDF')),
        ]),
        const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('اختار الطابعة من نافذة أندرويد، أو شارك PDF مع تطبيق الطابعة.', textAlign: TextAlign.center)),
        SingleChildScrollView(scrollDirection: Axis.horizontal, child: RepaintBoundary(key: receipt,
          child: SizedBox(width: labelWidth * 3.78, height: labelHeight * 3.78,
            child: ShippingLabelContent(order: widget.order)),
          )),
      ])));
  }
}

class ShippingLabelContent extends StatelessWidget {
  const ShippingLabelContent({required this.order, super.key});
  final Map<String, dynamic> order;

  @override
  Widget build(BuildContext context) {
    String money(num value) => '${value == value.round() ? value.toInt() : value.toStringAsFixed(2)} ${order['currency'] ?? 'EGP'}';
    final rows = <({String? text, double size, bool bold})>[
      (text: 'رقم الطلب: ${order['orderNumber'] ?? order['id'] ?? ''}', size: 12, bold: false),
      (text: 'العميل: ${order['customerRef'] ?? 'غير متاح'}', size: 20, bold: true),
      (text: '${order['customerPhone'] ?? 'غير متاح'}', size: 22, bold: true),
      (text: 'العنوان: ${order['customerAddress'] ?? 'غير متاح'}', size: 20, bold: true),
      (text: null, size: 6, bold: false),
      (text: 'المنتجات', size: 13, bold: true),
      for (final item in (order['items'] as List? ?? []))
        (text: '${item['title']} × ${item['quantity']}', size: 13, bold: false),
      (text: null, size: 6, bold: false),
      (text: 'المطلوب تحصيله', size: 13, bold: true),
      (text: money(shippingCollection(order)), size: 25, bold: true),
    ];
    return ColoredBox(color: Colors.white, child: Directionality(textDirection: TextDirection.rtl,
      child: LayoutBuilder(builder: (context, constraints) {
        TextStyle style(double size, bool bold, double scale) => DefaultTextStyle.of(context).style.copyWith(
          color: Colors.black, fontSize: size * scale, height: 1.15,
          fontWeight: bold ? FontWeight.w800 : FontWeight.normal);
        double height(double scale) {
          double total = 0;
          for (final row in rows) {
            if (row.text == null) { total += row.size * scale; continue; }
            final painter = TextPainter(text: TextSpan(text: row.text, style: style(row.size, row.bold, scale)),
              textDirection: TextDirection.rtl, textScaler: TextScaler.noScaling);
            painter.layout(maxWidth: constraints.maxWidth);
            total += painter.height;
            painter.dispose();
          }
          return total;
        }
        double low = 0;
        double high = 1.25;
        for (int i = 0; i < 18; i++) {
          final middle = (low + high) / 2;
          if (height(middle) <= constraints.maxHeight) { low = middle; } else { high = middle; }
        }
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [for (final row in rows)
            if (row.text == null) SizedBox(height: row.size * low, child: const Divider(height: 0, thickness: 1, color: Colors.black))
            else Text(row.text!, textAlign: TextAlign.right, textScaler: TextScaler.noScaling, style: style(row.size, row.bold, low)),
          ]);
      })));
  }
}
