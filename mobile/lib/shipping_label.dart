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
      (text: 'المطلوب تحصيله', size: 13, bold: true),
      (text: money(shippingCollection(order)), size: 25, bold: true),
    ];
    final style = DefaultTextStyle.of(context).style;
    return Semantics(label: rows.where((row) => row.text != null).map((row) => row.text).join('، '),
      child: CustomPaint(painter: ShippingLabelPainter(rows: rows, baseStyle: style)));
  }
}

class ShippingLabelPainter extends CustomPainter {
  ShippingLabelPainter({required this.rows, required this.baseStyle});
  final List<({String? text, double size, bool bold})> rows;
  final TextStyle baseStyle;

  TextPainter paragraph(int index, double scale, double width) {
    final row = rows[index];
    final painter = TextPainter(text: TextSpan(text: row.text, style: baseStyle.copyWith(
      color: Colors.black, fontSize: row.size * scale, height: 1.15,
      fontWeight: row.bold ? FontWeight.w800 : FontWeight.normal)),
      textAlign: TextAlign.right,
      textDirection: index == 2 || index == rows.length - 1 ? TextDirection.ltr : TextDirection.rtl,
      textScaler: TextScaler.noScaling);
    painter.layout(minWidth: width, maxWidth: width);
    return painter;
  }

  List<({int index, double top, double height, double scale})> layout(Size size) {
    double height(double scale) {
      double total = 0;
      for (int index = 0; index < rows.length; index++) {
        final row = rows[index];
        if (row.text == null) { total += row.size * scale; continue; }
        final painter = paragraph(index, scale, size.width);
        total += painter.height;
        painter.dispose();
      }
      return total;
    }
    double low = 0;
    double high = 1.25;
    for (int i = 0; i < 18; i++) {
      final middle = (low + high) / 2;
      if (height(middle) <= size.height) { low = middle; } else { high = middle; }
    }
    final gap = (size.height - height(low)).clamp(0, size.height) / (rows.length - 1);
    double y = 0;
    return [for (int index = 0; index < rows.length; index++) (() {
      final row = rows[index];
      final painter = row.text == null ? null : paragraph(index, low, size.width);
      final rowHeight = painter?.height ?? row.size * low;
      painter?.dispose();
      final result = (index: index, top: y, height: rowHeight, scale: low);
      y += rowHeight + gap;
      return result;
    })()];
  }

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = Colors.white);
    for (final line in layout(size)) {
      if (rows[line.index].text == null) {
        final y = line.top + line.height / 2;
        canvas.drawLine(Offset(0, y), Offset(size.width, y), Paint()..color = Colors.black..strokeWidth = 1);
      } else {
        final painter = paragraph(line.index, line.scale, size.width);
        painter.paint(canvas, Offset(0, line.top));
        painter.dispose();
      }
    }
  }

  @override
  bool shouldRepaint(covariant ShippingLabelPainter oldDelegate) => true;
}
