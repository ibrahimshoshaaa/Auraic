import 'package:flutter/material.dart';

String colorHex(Color color) => '#${(color.toARGB32() & 0xffffff).toRadixString(16).padLeft(6, '0').toUpperCase()}';
Color hexColor(String value, String fallback) => Color(int.parse('ff${(RegExp(r'^#[0-9a-fA-F]{6}$').hasMatch(value) ? value : fallback).substring(1)}', radix: 16));

Future<String?> pickColor(BuildContext context, {required String label, required Color initial}) async {
  var hsv = HSVColor.fromColor(initial);
  final picked = await showDialog<Color>(context: context, builder: (context) => StatefulBuilder(builder: (context, update) {
    final color = hsv.toColor();
    const palette = [Color(0xff19183B), Color(0xff3F3A60), Color(0xffFAEAB1), Colors.white, Colors.black, Color(0xffb42318), Color(0xff128c4e), Color(0xff2563eb), Color(0xfff59e0b), Color(0xffec4899)];
    Widget control(String title, double value, double max, ValueChanged<double> change) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title), Slider(value: value, max: max, label: '${(value / max * 100).round()}%', onChanged: (value) => update(() => change(value))),
    ]);
    return AlertDialog(title: Text(label), content: SizedBox(width: 320, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(height: 70, decoration: BoxDecoration(color: color, border: Border.all(color: Colors.grey), borderRadius: BorderRadius.circular(12))),
      const SizedBox(height: 8), Text(colorHex(color), textAlign: TextAlign.center, textDirection: TextDirection.ltr),
      const SizedBox(height: 16),
      Wrap(spacing: 8, runSpacing: 8, children: [for (final swatch in palette) Semantics(label: 'لون ${colorHex(swatch)}', button: true,
        child: InkWell(key: ValueKey('swatch-${colorHex(swatch)}'), onTap: () => update(() => hsv = HSVColor.fromColor(swatch)), borderRadius: BorderRadius.circular(8),
          child: Container(width: 40, height: 40, decoration: BoxDecoration(color: swatch, borderRadius: BorderRadius.circular(8), border: Border.all(color: colorHex(color) == colorHex(swatch) ? Theme.of(context).colorScheme.primary : Colors.grey, width: colorHex(color) == colorHex(swatch) ? 3 : 1)))))]),
      const SizedBox(height: 16),
      Container(height: 12, decoration: BoxDecoration(borderRadius: BorderRadius.circular(6), gradient: const LinearGradient(colors: [Colors.red, Colors.yellow, Colors.green, Colors.cyan, Colors.blue, Colors.purple, Colors.red]))),
      control('درجة اللون', hsv.hue, 360, (value) => hsv = hsv.withHue(value).withSaturation(hsv.saturation == 0 ? .8 : hsv.saturation).withValue(hsv.value == 0 ? .8 : hsv.value)),
      control('تشبّع اللون', hsv.saturation, 1, (value) => hsv = hsv.withSaturation(value)),
      control('الإضاءة', hsv.value, 1, (value) => hsv = hsv.withValue(value)),
    ]))), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')),
      FilledButton(onPressed: () => Navigator.pop(context, color), child: const Text('اختيار اللون'))]);
  }));
  return picked == null ? null : colorHex(picked);
}
