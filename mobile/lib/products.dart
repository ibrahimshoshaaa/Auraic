import 'admin_product_card.dart';
import 'package:flutter/material.dart';

import 'api.dart';
import 'recipes.dart';
import 'ui.dart';
import 'storefront.dart';

class ProductsPage extends StatefulWidget {
  const ProductsPage({required this.api, required this.canWrite, super.key});
  final ErpApi api;
  final bool canWrite;

  @override
  State<ProductsPage> createState() => _ProductsPageState();
}
class _ProductsPageState extends State<ProductsPage> {
  bool samples = false;
  ErpApi get api => widget.api;
  bool get canWrite => widget.canWrite;

  @override
  Widget build(BuildContext context) => DataView(api: api, path: '/api/products',
    rowFilter: (product) => isSampleCategory(str(product['storefrontCategory'])) == samples,
    title: 'المنتجات', subtitle: 'الأحجام والوصفات والنشر في المتجر', icon: Icons.inventory_2_outlined,
    action: (context, reload) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (canWrite) Row(children: [for (final sample in [false, true]) Expanded(child: Padding(padding: const EdgeInsets.all(3), child: FilledButton(onPressed: () async { final saved = await openPage<bool>(context, ProductManagePage(api: api, sample: sample)); if (saved == true) reload(); }, child: Text(sample ? 'إضافة سامبلز' : 'إضافة عطر وأحجامه', textAlign: TextAlign.center))))]),
      const SizedBox(height: 12),
      SegmentedButton<bool>(segments: const [ButtonSegment(value: false, label: Text('العطور')), ButtonSegment(value: true, label: Text('السامبلز'))], selected: {samples}, onSelectionChanged: (value) => setState(() => samples = value.first)),
    ]),
    collectionBuilder: (children) => AdminProductGrid(children: children),
    item: (context, product, reload) => AdminProductCard(product: product,
      onTap: () async { await openPage(context, ProductDetail(api: api,
        product: product, canWrite: canWrite)); reload(); },
    ));
}

class ProductDetail extends StatefulWidget {
  const ProductDetail({required this.api, required this.product,
    required this.canWrite, super.key});
  final ErpApi api;
  final Json product;
  final bool canWrite;
  @override
  State<ProductDetail> createState() => _ProductDetailState();
}

class _ProductDetailState extends State<ProductDetail> {
  late Future<Json> detail = fetch();
  Future<Json> fetch() async => json((await widget.api.get('/api/products/${widget.product['id']}'))['data']);
  void reload() => setState(() => detail = fetch());

  Future<void> archive(Json product) async {
    if (!await confirm(context, 'إخفاء المنتج من القائمة والطلبات الجديدة؟ ستبقى بيانات الطلبات السابقة محفوظة.')) return;
    try {
      await perform(context, () => widget.api.delete('/api/products/${product['id']}'),
        success: 'تمت أرشفة المنتج');
      if (mounted) Navigator.pop(context, true);
    } catch (_) { /* Error shown by helper. */ }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(str(widget.product['title']))),
    body: FutureBuilder<Json>(future: detail, builder: (context, snapshot) {
      if (!snapshot.hasData) return snapshot.hasError
        ? Center(child: TextButton(onPressed: reload, child: const Text('تعذر التحميل · إعادة المحاولة')))
        : const PageSkeleton();
      final product = snapshot.data!;
      return RefreshIndicator(onRefresh: () async { reload(); await detail; },
        child: ListView(padding: const EdgeInsets.all(16), children: [
      PageIntro(title: str(product['title']), subtitle: 'الأحجام والوصفات وحالة النشر', icon: Icons.inventory_2_outlined),
      const SizedBox(height: 16),
      Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(
        crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('حالة المنتج', style: TextStyle(fontSize: 16,
          fontWeight: FontWeight.w800, color: appInk)),
        const SizedBox(height: 10),
        StatusPill(label: product['storefrontPublished'] == true ? 'منشور في المتجر' : 'غير منشور', color: product['storefrontPublished'] == true ? appNavy : appMuted),
        const SizedBox(height: 8),
        Text('${(product['variants'] as List).length} أحجام',
          style: const TextStyle(color: appMuted)),
      ]))),
      const SizedBox(height: 14),
      if (widget.canWrite) FilledButton.icon(onPressed: () async { final saved = await openPage<bool>(context, ProductManagePage(api: widget.api, productId: str(product['id']))); if (saved == true) reload(); }, icon: const Icon(Icons.edit_outlined), label: const Text('تعديل البيانات والأحجام والأسعار والوصفات')),
      const SizedBox(height: 20),
      const Text('الأحجام والوصفات', style: TextStyle(fontSize: 19,
        fontWeight: FontWeight.w800, color: appInk)),
      const SizedBox(height: 12),
      for (final v in (product['variants'] as List).map(json).where((v) => v['active'] == true)) Card(
        margin: const EdgeInsets.only(bottom: 14), child: ExpansionTile(
        tilePadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        title: Text(str(v['title']), style: const TextStyle(fontSize: 17,
          fontWeight: FontWeight.w800)),
        subtitle: Padding(padding: const EdgeInsets.only(top: 5),
          child: Text('${str(v['price'])} EGP${str(v['sku']).isEmpty ? '' : ' · ${str(v['sku'])}'}')),
        children: [
          const Divider(),
          if (v['costing'] is Map && (v['costing'] as Map)['estimatedCost'] != null)
            ListTile(title: const Text('تكلفة الوصفة للقطعة'),
              trailing: Text((v['costing'] as Map)['complete'] == true ? '${(v['costing'] as Map)['estimatedCost']} EGP' : 'غير مكتملة')),
          if (v['costing'] is Map && (v['costing'] as Map)['complete'] == true)
            ListTile(title: const Text('الربح المتوقع قبل التشغيل'), trailing: Text('${(v['costing'] as Map)['estimatedMargin']} EGP')),
          if (v['recipes'] is List && (v['recipes'] as List).isNotEmpty) ...[
            const Align(alignment: AlignmentDirectional.centerStart,
              child: Text('الوصفة الحالية', style: TextStyle(
                fontWeight: FontWeight.w800, color: appInk))),
            const SizedBox(height: 8),
            for (final recipe in (v['recipes'] as List).map(json)) ...[
              for (final version in (recipe['versions'] as List).map(json))
                for (final item in (version['items'] as List).map(json))
                  ListTile(dense: true,
                    title: Text(str((item['material'] as Map?)?['name'])),
                    trailing: Text('${str(item['quantity'])} ${str(item['unit'])}')),
              if (widget.canWrite) SizedBox(width: double.infinity,
                child: OutlinedButton.icon(onPressed: () async {
                  final saved = await openPage<bool>(context, RecipeForm(
                    api: widget.api, recipeId: str(recipe['id'])));
                  if (saved == true) reload();
                }, icon: const Icon(Icons.edit_outlined),
                  label: const Text('تعديل الوصفة'))),
              const SizedBox(height: 8),
            ],
          ],
          if (widget.canWrite && (v['recipes'] is! List || (v['recipes'] as List).isEmpty))
            SizedBox(width: double.infinity, child: OutlinedButton.icon(
              icon: const Icon(Icons.add), label: const Text('إضافة وصفة لهذا الحجم'),
              onPressed: () async { final saved = await openPage<bool>(context,
                RecipeForm(api: widget.api, initialVariantId: str(v['id']))); if (saved == true) reload(); })),
        ],
      )),
      if (widget.canWrite) SizedBox(width: double.infinity,
        child: OutlinedButton.icon(onPressed: () async {
        final saved = await openPage<bool>(context,
          ProductManagePage(api: widget.api, productId: str(product['id'])));
        if (saved == true) reload();
      },
        icon: const Icon(Icons.add), label: const Text('إضافة حجم'))),
      if (widget.canWrite) ...[
        const SizedBox(height: 24),
        const Divider(),
        TextButton.icon(onPressed: () => archive(product),
          icon: const Icon(Icons.delete_outline), label: const Text('حذف المنتج من ERP'),
          style: TextButton.styleFrom(foregroundColor: const Color(0xffa33146))),
      ],
    ]));
    }),
  );
}
