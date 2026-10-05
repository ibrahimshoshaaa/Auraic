import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'api.dart';
import 'ui.dart';

class ProductImages extends StatefulWidget {
  const ProductImages({required this.api, required this.initial, required this.onChanged, required this.onBusy, this.maxImages = 8, this.enabled = true, super.key});
  final ErpApi api;
  final int maxImages;
  final bool enabled;
  final List<String> initial;
  final ValueChanged<List<String>> onChanged;
  final ValueChanged<bool> onBusy;
  @override
  State<ProductImages> createState() => _ProductImagesState();
}
class _ProductImagesState extends State<ProductImages> {
  late final List<String> slots = List.generate(widget.maxImages == 1 ? 1 : widget.initial.length > 4 ? widget.initial.length : 4, (index) => index < widget.initial.length ? widget.initial[index] : '');
  int? uploading;
  String error = '';
  void change() => widget.onChanged(slots.map((url) => url.trim()).where((url) => url.isNotEmpty).toList());
  Future<void> upload(int index) async {
    if (uploading != null || !widget.enabled) return;
    setState(() { uploading = index; error = ''; }); widget.onBusy(true);
    try {
      final file = await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1800, maxHeight: 1800, imageQuality: 85);
      if (file == null) return;
      final url = await widget.api.uploadProductImage(await file.readAsBytes(), file.name);
      if (mounted) { setState(() => slots[index] = url); change(); }
    } catch (failure) { if (mounted) setState(() => error = '$failure'); }
    finally { if (mounted) { setState(() => uploading = null); widget.onBusy(false); } }
  }
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
    Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: const Color(0xfff5f6f9), borderRadius: BorderRadius.circular(18)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(widget.maxImages == 1 ? 'صورة القسم' : 'صور المنتج', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)), SizedBox(height: 8), Text(widget.maxImages == 1 ? 'ارفع تصميم القسم كصورة واحدة من المعرض أو استخدم رابط HTTPS. JPG أو PNG حتى 3 ميجابايت.' : 'الصورة الأولى هي الرئيسية. ارفع من المعرض أو استخدم رابط HTTPS. حتى ${widget.maxImages} صور، JPG أو PNG حتى 3 ميجابايت.', style: TextStyle(color: appMuted, height: 1.7))])),
    const SizedBox(height: 16),
    for (var index = 0; index < slots.length; index++) Container(margin: const EdgeInsets.only(bottom: 14), padding: const EdgeInsets.all(16), decoration: BoxDecoration(border: Border.all(color: const Color(0xffe5e7eb)), borderRadius: BorderRadius.circular(18)), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(children: [Expanded(child: Text(index == 0 ? 'الصورة الرئيسية' : 'صورة ${index + 1}', style: const TextStyle(color: appMuted))), if (slots[index].isNotEmpty) IconButton(tooltip: 'حذف الصورة', onPressed: uploading != null || !widget.enabled ? null : () { setState(() => slots[index] = ''); change(); }, icon: const Icon(Icons.close, size: 20))]),
      if (slots[index].startsWith('https://')) Padding(padding: const EdgeInsets.only(bottom: 12), child: Image.network(slots[index], height: 100, fit: BoxFit.contain, errorBuilder: (_, failure, stack) => const Icon(Icons.broken_image_outlined))),
      Row(children: [Expanded(child: TextFormField(key: ValueKey('image-$index-${slots[index]}'), initialValue: slots[index], enabled: uploading == null && widget.enabled, decoration: const InputDecoration(hintText: 'رابط الصورة', border: OutlineInputBorder()), keyboardType: TextInputType.url, validator: (value) { if ((value ?? '').trim().isEmpty) return null; final uri = Uri.tryParse(value!.trim()); return uri?.scheme != 'https' || (uri?.host ?? '').isEmpty ? 'استخدم رابط HTTPS صحيحًا' : null; }, onChanged: (value) { slots[index] = value; change(); })), const SizedBox(width: 8), OutlinedButton(onPressed: uploading != null || !widget.enabled ? null : () => upload(index), child: Text(uploading == index ? '…' : '↑ رفع'))]),
      if (slots[index].isNotEmpty && index > 0) TextButton(onPressed: uploading != null || !widget.enabled ? null : () { setState(() { final first = slots[0]; slots[0] = slots[index]; slots[index] = first; }); change(); }, child: const Text('اجعلها الصورة الرئيسية')),
    ])),
    if (slots.length < widget.maxImages) OutlinedButton.icon(onPressed: uploading != null || !widget.enabled ? null : () => setState(() => slots.add('')), icon: const Icon(Icons.add), label: const Text('صورة أخرى')),
    if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
  ]);
}
