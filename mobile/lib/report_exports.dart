import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'api.dart';

typedef ReportShare = Future<void> Function(Uint8List bytes, String name, String mime, Rect origin);
Future<void> shareReportFile(Uint8List bytes, String name, String mime, Rect origin) async {
  await SharePlus.instance.share(ShareParams(files: [XFile.fromData(bytes, mimeType: mime)], fileNameOverrides: [name], sharePositionOrigin: origin));
}
class ReportExportButtons extends StatefulWidget {
  const ReportExportButtons({required this.api, required this.period, required this.from, required this.to, this.enabled = true, this.share = shareReportFile, super.key});
  final ErpApi api;
  final String period;
  final String from;
  final String to;
  final bool enabled;
  final ReportShare share;
  @override
  State<ReportExportButtons> createState() => _ReportExportButtonsState();
}
class _ReportExportButtonsState extends State<ReportExportButtons> {
  String busy = '';
  String error = '';
  Future<void> export(String format) async {
    if (busy.isNotEmpty) return;
    final range = (widget.from, widget.to);
    final query = Uri(queryParameters: {'format': format, 'period': widget.period, 'from': range.$1, 'to': range.$2}).query;
    final box = context.findRenderObject() as RenderBox?;
    final origin = box == null ? const Rect.fromLTWH(0, 0, 1, 1) : box.localToGlobal(Offset.zero) & box.size;
    setState(() { busy = format; error = ''; });
    try {
      final bytes = await widget.api.download('/api/reports/export?$query');
      if (!mounted) return;
      await widget.share(bytes, 'auraic-report-${range.$1}-${range.$2}.$format', format == 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', origin);
    } catch (e) { if (mounted) setState(() { error = '$e'; }); }
    finally { if (mounted) setState(() { busy = ''; }); }
  }
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Wrap(spacing: 8, runSpacing: 8, children: [for (final format in ['pdf', 'xlsx']) OutlinedButton.icon(
      onPressed: !widget.enabled || busy.isNotEmpty ? null : () => export(format), icon: Icon(format == 'pdf' ? Icons.picture_as_pdf_outlined : Icons.table_view_outlined),
      label: Text(busy == format ? 'جارٍ تجهيز الملف…' : format == 'pdf' ? 'تصدير PDF' : 'تصدير Excel'))]),
    const Text('كل أقسام التقرير للفترة المختارة. احفظ الملف أو شاركه من قائمة المشاركة.', style: TextStyle(fontSize: 11)),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
  ]);
}
