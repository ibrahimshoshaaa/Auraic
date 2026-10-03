import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api.dart';
class HeroVideo extends StatefulWidget {
 const HeroVideo({required this.api, required this.initial, required this.onChanged, required this.onBusy, this.enabled = true, super.key});
 final bool enabled; final ErpApi api; final String initial; final ValueChanged<String> onChanged; final ValueChanged<bool> onBusy;
 @override
 State<HeroVideo> createState() => _HeroVideoState();
}
class _HeroVideoState extends State<HeroVideo> {
 late final controller = TextEditingController(text: widget.initial);
 bool busy = false; String error = '';
 @override
 void dispose() { controller.dispose(); super.dispose(); }
 Future<void> upload() async {
  if (busy || !widget.enabled) return;
  setState(() { busy = true; error = ''; }); widget.onBusy(true);
  try {
   final file = await ImagePicker().pickVideo(source: ImageSource.gallery);
   if (file == null) return;
   if (await file.length() > 20 * 1024 * 1024) throw const ApiException('اختر فيديو حتى 20 ميجابايت', 422);
   final url = await widget.api.uploadHeroVideo(await file.readAsBytes(), file.name);
   if (!mounted) return;
   controller.text = url; widget.onChanged(url);
  } catch (cause) { if (mounted) setState(() => error = '$cause'); }
  finally { if (mounted) { setState(() => busy = false); widget.onBusy(false); } }
 }
 @override
 Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
  TextFormField(controller: controller, enabled: !busy && widget.enabled, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'فيديو الهيرو', hintText: 'رابط HTTPS أو ارفع من الجهاز', border: OutlineInputBorder()), validator: (value) { if ((value ?? '').trim().isEmpty) return null; final uri = Uri.tryParse(value!.trim()); return uri?.scheme == 'https' && (uri?.host ?? '').isNotEmpty ? null : 'استخدم رابط HTTPS صحيحًا'; }, onChanged: (value) { widget.onChanged(value); setState(() {}); }),
  const SizedBox(height: 12),
  FilledButton.icon(onPressed: busy || !widget.enabled ? null : upload, icon: const Icon(Icons.video_library_outlined), label: Text(busy ? 'جارٍ رفع الفيديو…' : 'رفع فيديو من الجهاز')),
  if (controller.text.startsWith('https://')) Row(children: [Expanded(child: TextButton.icon(onPressed: busy || !widget.enabled ? null : () async { final opened = await launchUrl(Uri.parse(controller.text), mode: LaunchMode.externalApplication); if (!opened && context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('تعذر فتح معاينة الفيديو'))); }, icon: const Icon(Icons.play_circle_outline), label: const Text('معاينة الفيديو'))), TextButton(onPressed: busy || !widget.enabled ? null : () { setState(() => controller.clear()); widget.onChanged(''); }, child: const Text('حذف'))]),
  const Text('MP4 أو WebM حتى 20 ميجابايت. احفظ تعديلات الموقع بعد الرفع.'),
  if (error.isNotEmpty) Text(error, style: const TextStyle(color: Colors.red)),
 ]);
}
