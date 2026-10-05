import 'package:flutter/material.dart';
import 'api.dart';

class AdminProductGrid extends StatelessWidget {
  const AdminProductGrid({required this.children, super.key});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, constraints) {
    final columns = constraints.maxWidth >= 900 ? 4 : constraints.maxWidth >= 600 ? 3 : constraints.maxWidth < 300 ? 1 : 2;
    final width = (constraints.maxWidth - (columns - 1) * 12) / columns;
    return Wrap(spacing: 12, runSpacing: 12, children: [for (final child in children) SizedBox(width: width, child: child)]);
  });
}

class AdminProductCard extends StatelessWidget {
  const AdminProductCard({required this.product, required this.onTap, this.actionLabel = 'عرض التفاصيل', super.key});
  final Json product;
  final VoidCallback onTap;
  final String actionLabel;
  @override
  Widget build(BuildContext context) {
    const cream = Color(0xffFAEAB1);
    const navy = Color(0xff19183B);
    final images = (product['storefrontImages'] as List? ?? []).map(str).toList();
    final variants = (product['variants'] as List? ?? []).map(json).toList();
    bool hundred(Json variant) => RegExp(r'^100\s*(ml|مل)?$', caseSensitive: false).hasMatch(str(variant['title']).trim());
    variants.sort((a, b) => (hundred(b) ? 1 : 0).compareTo(hundred(a) ? 1 : 0));
    String amount(dynamic value) { final n = double.tryParse(str(value)) ?? 0; return '${n == n.roundToDouble() ? n.toInt() : n} EGP'; }
    final inspired = str(product['storefrontInspiredBy']);
    final badge = str(product['storefrontBadge']);
    return Material(color: const Color(0xff3F3A60), borderRadius: BorderRadius.circular(16), clipBehavior: Clip.antiAlias,
      child: InkWell(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        AspectRatio(aspectRatio: 4 / 5, child: Stack(fit: StackFit.expand, children: [
          ColoredBox(color: navy, child: images.isEmpty
            ? const Icon(Icons.inventory_2_outlined, color: cream, size: 48)
            : Image.network(images.first, fit: BoxFit.cover,
                errorBuilder: (_, error, stack) => const Center(child: Icon(Icons.broken_image_outlined, color: cream, size: 40)))),
          Positioned(top: 8, right: 8, left: 8, child: Wrap(spacing: 6, runSpacing: 6, children: [
            Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4), decoration: BoxDecoration(color: navy, borderRadius: BorderRadius.circular(7)),
              child: Text(product['storefrontPublished'] == true ? 'منشور' : 'غير منشور', style: const TextStyle(color: cream, fontSize: 10))),
            if (badge.isNotEmpty) Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4), decoration: BoxDecoration(color: cream, borderRadius: BorderRadius.circular(7)),
              child: Text(badge, style: const TextStyle(color: navy, fontSize: 10, fontWeight: FontWeight.w700))),
          ])),
        ])),
        Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(str(product['title']), style: const TextStyle(color: cream, fontSize: 17, fontWeight: FontWeight.w800)),
          if (inspired.isNotEmpty) ...[const SizedBox(height: 8), const Text('Inspired by', style: TextStyle(color: Color(0xffd2cade), fontSize: 11)),
            Text(inspired, style: const TextStyle(color: cream, fontSize: 12, fontWeight: FontWeight.w600))],
          const SizedBox(height: 12),
          Wrap(spacing: 6, runSpacing: 6, children: [for (var i = 0; i < variants.length; i++) Container(
            padding: const EdgeInsets.all(7), decoration: BoxDecoration(color: i == 0 ? cream : Colors.transparent,
              border: Border.all(color: cream.withValues(alpha: .4)), borderRadius: BorderRadius.circular(8)),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(RegExp(r'^\d+$').hasMatch(str(variants[i]['title'])) ? '${variants[i]['title']} ml' : str(variants[i]['title']), style: TextStyle(fontSize: 11, color: i == 0 ? navy : cream)),
              Text(amount(variants[i]['price']), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: i == 0 ? navy : cream)),
              if ((double.tryParse(str(variants[i]['compareAtPrice'])) ?? 0) > (double.tryParse(str(variants[i]['price'])) ?? 0)) Text(amount(variants[i]['compareAtPrice']), style: TextStyle(fontSize: 10, decoration: TextDecoration.lineThrough, color: i == 0 ? navy : cream)),
            ])),
          ]),
          if (variants.isEmpty) const Text('لم تُضف أحجام بعد', style: TextStyle(color: cream, fontSize: 11)),
          const SizedBox(height: 14),
          Row(children: [const Icon(Icons.edit_outlined, size: 16, color: cream), const SizedBox(width: 6), Expanded(child: Text(actionLabel, style: const TextStyle(color: cream, fontSize: 12)))]),
        ])),
      ])));
  }
}
