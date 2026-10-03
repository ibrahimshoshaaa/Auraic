import 'package:flutter/material.dart';
import 'ui.dart';

class RecipePicker extends StatefulWidget {
  const RecipePicker({required this.materials, required this.lines, required this.onChanged, this.disabled = false, super.key});
  final List<Json> materials;
  final List<Json> lines;
  final ValueChanged<List<Json>> onChanged;
  final bool disabled;
  @override
  State<RecipePicker> createState() => _RecipePickerState();
}
class _RecipePickerState extends State<RecipePicker> {
  String search = '';
  String group(Json material) => material['materialType'] is Map ? str(material['materialType']['name']) : 'الخامات';
  List<Json> get chosen => widget.lines.where((line) => str(line['materialId']).isNotEmpty).toList();
  void toggle(String id) {
    final next = chosen.map((line) => Map<String, dynamic>.from(line)).toList();
    if (next.any((line) => line['materialId'] == id)) { next.removeWhere((line) => line['materialId'] == id); }
    else if (next.length < 30) { next.add({'materialId': id, 'quantity': 1}); }
    widget.onChanged(next);
  }
  void amount(String id, double value) => widget.onChanged(chosen.map((line) => <String, dynamic>{...line, if (line['materialId'] == id) 'quantity': double.parse(value.clamp(0.000001, 10000000).toStringAsFixed(6))}).toList());
  Future<void> precise(Json line, String unit) async {
    final controller = TextEditingController(text: str(line['quantity']));
    final form = GlobalKey<FormState>();
    final value = await showDialog<double>(context: context, builder: (context) => AlertDialog(title: Text('الكمية ($unit)'), content: Form(key: form, child: TextFormField(controller: controller, autofocus: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), validator: (text) { final value = double.tryParse(text ?? ''); return value == null || !value.isFinite || value <= 0 || value > 10000000 ? 'أدخل كمية صحيحة' : null; })), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('إلغاء')), FilledButton(onPressed: () { if (form.currentState!.validate()) Navigator.pop(context, double.parse(controller.text)); }, child: const Text('تطبيق'))]));
    // The dialog may still be animating out when this future resolves.
    if (value != null && mounted) amount(str(line['materialId']), value);
    await Future<void>.delayed(const Duration(milliseconds: 350));
    controller.dispose();
  }
  @override
  Widget build(BuildContext context) {
    final groups = widget.materials.map(group).toSet();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: const Color(0xfff5f3f8), borderRadius: BorderRadius.circular(16)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('كوّن الوصفة بضغطة', style: TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 8), const Text('اضغط الخامة لإضافتها، ثم اختر الكمية. الكميات لقطعة واحدة؛ راجع الزيت لكل حجم.', style: TextStyle(fontSize: 12, color: appMuted)), const SizedBox(height: 12), TextField(enabled: !widget.disabled, decoration: const InputDecoration(hintText: 'ابحث عن زيت أو زجاجة أو بوكس', prefixIcon: Icon(Icons.search), border: OutlineInputBorder()), onChanged: (value) => setState(() => search = value))])),
      for (final category in groups) Builder(builder: (context) {
        final found = widget.materials.where((material) => group(material) == category && str(material['name']).toLowerCase().contains(search.toLowerCase())).toList();
        if (found.isEmpty) return const SizedBox.shrink();
        return ExpansionTile(key: ValueKey('recipe-group-$category'), initiallyExpanded: true, title: Text(category, style: const TextStyle(fontWeight: FontWeight.w700)), children: [Padding(padding: const EdgeInsets.only(bottom: 16), child: Wrap(spacing: 8, runSpacing: 8, children: found.map((material) { final id = str(material['id']); final selected = chosen.any((line) => line['materialId'] == id); return FilterChip(label: Text('${material['name']} · ${material['unit']}'), selected: selected, onSelected: widget.disabled || (!selected && chosen.length >= 30) ? null : (_) => toggle(id)); }).toList()))]);
      }),
      if (chosen.isEmpty) const Padding(padding: EdgeInsets.all(12), child: Text('اختر خامة واحدة على الأقل.', style: TextStyle(color: appMuted))),
      for (final line in chosen) Builder(builder: (context) {
        final matches = widget.materials.where((material) => material['id'] == line['materialId']);
        final material = matches.isEmpty ? <String, dynamic>{'name': 'خامة غير متاحة', 'unit': ''} : matches.first;
        final unit = str(material['unit']); final liquid = unit.toLowerCase() == 'ml';
        final quantity = double.tryParse(str(line['quantity'])) ?? 1; final increment = liquid ? 0.5 : 1.0;
        return Container(margin: const EdgeInsets.only(bottom: 14), padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: const Color(0xfff8f9fb), border: Border.all(color: const Color(0xffe5e7eb)), borderRadius: BorderRadius.circular(16)), child: Column(children: [
          Row(children: [Expanded(child: Text(str(material['name']), style: const TextStyle(fontWeight: FontWeight.w700))), IconButton(tooltip: 'حذف الخامة', onPressed: widget.disabled ? null : () => toggle(str(line['materialId'])), icon: const Icon(Icons.close, size: 20))]),
          Row(children: [IconButton(tooltip: 'تقليل الكمية', onPressed: widget.disabled || quantity <= increment ? null : () => amount(str(line['materialId']), quantity - increment), icon: const Icon(Icons.remove_circle_outline)), Expanded(child: Text('${quantity.toString().replaceAll(RegExp(r'\.0$'), '')} $unit', textAlign: TextAlign.center, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800))), IconButton(tooltip: 'زيادة الكمية', onPressed: widget.disabled ? null : () => amount(str(line['materialId']), quantity + increment), icon: const Icon(Icons.add_circle_outline))]),
          Wrap(spacing: 8, runSpacing: 4, children: (liquid ? [5, 10, 15, 20, 25, 30] : [1, 2, 3, 5]).map((value) => ChoiceChip(label: Text('$value $unit'), selected: quantity == value, onSelected: widget.disabled ? null : (_) => amount(str(line['materialId']), value.toDouble()))).toList()),
          TextButton(onPressed: widget.disabled ? null : () => precise(line, unit), child: const Text('كمية دقيقة (اختياري)')),
        ]));
      }),
    ]);
  }
}
