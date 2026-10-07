import 'package:flutter/material.dart';

import 'api.dart';
import 'ui.dart';

class ReportsPage extends StatefulWidget {
  const ReportsPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<ReportsPage> createState() => _ReportsPageState();
}
class _ReportsPageState extends State<ReportsPage> {
  String period = '7d';
  DateTime? from;
  DateTime? to;
  late Future<dynamic> report = load();
  String date(DateTime value) => '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
  Future<dynamic> load() => widget.api.get(period == 'custom' && from != null && to != null
    ? '/api/reports?period=custom&from=${date(from!)}&to=${date(to!)}'
    : '/api/reports?period=$period');
  void choose(String value) => setState(() { period = value; report = load(); });
  Future<void> custom() async {
    final picked = await showDateRangePicker(context: context,
      firstDate: DateTime(2020), lastDate: DateTime.now(),
      initialDateRange: from != null && to != null ? DateTimeRange(start: from!, end: to!) : null);
    if (picked != null) setState(() {
      from = picked.start; to = picked.end; period = 'custom'; report = load();
    });
  }
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
    const PageIntro(title: 'التقارير', subtitle: 'ملخص المبيعات والتحصيل والمخزون', icon: Icons.bar_chart_rounded),
    const SizedBox(height: 16),
    Wrap(spacing: 8, children: const {'today': 'اليوم', 'yesterday': 'أمس',
      '7d': 'آخر ٧ أيام', '30d': 'آخر ٣٠ يوم', '60d': 'آخر ٦٠ يوم',
      'month': 'هذا الشهر', 'lastMonth': 'الشهر الماضي'}.entries.map((entry) =>
      ChoiceChip(label: Text(entry.value), selected: period == entry.key,
        onSelected: (_) => choose(entry.key))).toList()),
    OutlinedButton.icon(onPressed: custom, icon: const Icon(Icons.date_range),
      label: Text(period == 'custom' && from != null && to != null
        ? '${date(from!)} – ${date(to!)}' : 'فترة مخصصة')),
    FutureBuilder<dynamic>(future: report, builder: (context, snapshot) {
      if (!snapshot.hasData) return snapshot.hasError
        ? TextButton(onPressed: () => choose(period), child: Text('${snapshot.error} · إعادة المحاولة'))
        : const PageSkeleton(embedded: true);
      final data = json(snapshot.data['data']);
      final sales = json(data['sales']);
      final cash = json(data['cash']);
      final returns = json(data['returns']);
      final expenses = json(data['expenses']);
      Widget section(String title, List<Widget> children) => Card(child: ExpansionTile(
        title: Text(title), initiallyExpanded: title == 'المبيعات', children: children));
      Widget line(String title, dynamic value) => ListTile(title: Text(title), trailing: Text(statistic(value)));
      Widget kpi(String label, dynamic value, IconData icon) => Card(child: Padding(
        padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start,
          children: [Icon(icon, color: appNavy, size: 21), const SizedBox(height: 12),
            Text(label, style: const TextStyle(fontSize: 12, color: appMuted)),
            const SizedBox(height: 5), Text(statistic(value), textDirection: TextDirection.ltr,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: appInk))])));
      return Column(children: [
        const SizedBox(height: 12),
        Row(children: [Expanded(child: kpi('إجمالي المبيعات', sales['total'] ?? (num.tryParse('${sales['gross']}') ?? 0) - (num.tryParse('${sales['discounts']}') ?? 0) - (num.tryParse('${sales['shipping']}') ?? 0), Icons.trending_up)),
          const SizedBox(width: 10), Expanded(child: kpi('صافي المبيعات', sales['net'], Icons.show_chart))]),
        const SizedBox(height: 10),
        Row(children: [Expanded(child: kpi('الدفعات المستلمة', cash['received'], Icons.account_balance_wallet_outlined)),
          const SizedBox(width: 10), Expanded(child: kpi('عدد الطلبات', sales['orders'], Icons.receipt_long_outlined))]),
        const SizedBox(height: 16),
        const FormSection(title: 'تفاصيل الفترة'),
        section('المبيعات', [
          line('الوحدات المباعة', sales['units']),
          line('متوسط الطلب', sales['averageOrderValue']),
          line('الشحن (منفصل)', sales['shipping']), line('المبيعات قبل الخصم وبدون الشحن', (num.tryParse('${sales['gross']}') ?? 0) - (num.tryParse('${sales['shipping']}') ?? 0)), line('الخصومات', sales['discounts']), line('المسترد', sales['refunded']),
          line('الديبوزت', cash['deposits']),
        ]),
        section('الربح وROAS', [
          line('صافي الربح بعد تكلفة الوصفة', json(data['profit'])['profit'] ?? 'غير مكتمل'),
          line('تكلفة الوصفات', json(data['profit'])['recipeCost']),
          line('نسبة الربح', json(data['profit'])['margin'] == null ? '—' : '${json(data['profit'])['margin']}%'),
          line('مصاريف السوشيال', json(data['roas'])['spend']),
          line('ROAS', json(data['roas'])['ratio'] == null ? '—' : '${json(data['roas'])['ratio']}×'),
        ]),
        section('المنتجات', [for (final product in (data['products'] as List).map(json))
          ListTile(title: Text('${product['product']} · ${product['variant']}'),
            subtitle: Text('الوحدات: ${product['units']}'), trailing: Text(statistic(product['net'])))]),
        section('المرتجعات', [line('عدد المرتجعات', returns['count']),
          line('قيمتها', returns['value']), line('تكلفتها', returns['costs'])]),
        section('المصروفات', [line('إجمالي المصروفات', expenses['total']),
          for (final category in (expenses['byCategory'] as List).map(json))
            line(str(category['category'] ?? category['name']), category['amount'])]),
        section('استهلاك الخامات', [for (final material in (data['consumption'] as List).map(json))
          line(str(material['name']), '${material['consumed']} ${material['unit']}')]),
        section('المخزون الحالي', [for (final material in (data['inventory'] as List).map(json))
          line(str(material['name']), '${material['stock']} ${material['unit']}')]),
      ]);
    }),
  ]);
}

class ConsumptionPage extends StatelessWidget {
  const ConsumptionPage({required this.api, this.orderId, super.key});
  final ErpApi api;
  final String? orderId;
  @override
  Widget build(BuildContext context) => DataView(api: api,
    title: 'استهلاك الخامات', subtitle: 'تفاصيل المواد المستخدمة في الطلبات', icon: Icons.science_outlined,
    path: '/api/consumption?limit=100${orderId == null ? '' : '&orderId=${Uri.encodeQueryComponent(orderId!)}'}',
    item: (context, entry, reload) => Card(child: ExpansionTile(
      title: Text('طلب #${str((entry['order'] as Map?)?['orderNumber'])}'),
      subtitle: Text('${str(entry['createdAt'])} · ${str(entry['status'])}'),
      children: [for (final line in (entry['items'] as List? ?? []).map(json))
        ListTile(title: Text(str((line['material'] as Map?)?['name'])),
          subtitle: Text('${str(line['quantity'])} ${str(line['unit'])}'))],
    )));
}

class SettingsPage extends StatefulWidget {
  const SettingsPage({required this.api, required this.isOwner, required this.onAccount, super.key});
  final ErpApi api;
  final bool isOwner;
  final VoidCallback onAccount;
  @override
  State<SettingsPage> createState() => _SettingsPageState();
}
class _SettingsPageState extends State<SettingsPage> {
  final name = TextEditingController();
  final amount = TextEditingController();
  bool costing = false;
  bool instaPayEnabled = false;
  bool walletEnabled = false;
  final instaPayAddress = TextEditingController();
  final walletNumber = TextEditingController();
  final depositPercent = TextEditingController();
  bool initialized = false;
  late Future<dynamic> current = widget.api.get('/api/mobile/settings');
  @override
  void dispose() { name.dispose(); amount.dispose(); instaPayAddress.dispose(); walletNumber.dispose(); depositPercent.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
    const PageIntro(title: 'الإعدادات', subtitle: 'الحساب وإعدادات المتجر', icon: Icons.settings_outlined),
    const SizedBox(height: 16),
    Card(child: ListTile(leading: const Icon(Icons.admin_panel_settings_outlined),
      title: const Text('الحساب والأمان'), subtitle: const Text('كلمة المرور والمستخدمون'),
      trailing: const Icon(Icons.chevron_left), onTap: widget.onAccount)),
    const SizedBox(height: 12),
    FutureBuilder<dynamic>(future: current, builder: (context, snapshot) {
      if (!snapshot.hasData) return snapshot.hasError
        ? TextButton(onPressed: () => setState(() => current = widget.api.get('/api/mobile/settings')),
            child: const Text('تعذر تحميل الإعدادات · إعادة المحاولة'))
        : const PageSkeleton(embedded: true);
      final store = json(snapshot.data['data']);
      if (!initialized) {
        initialized = true;
        name.text = str(store['name']);
        amount.text = str(store['defaultReturnCost']);
        costing = store['costingEnabled'] == true;
        instaPayEnabled = store['paymentInstaPayEnabled'] == true;
        walletEnabled = store['paymentWalletEnabled'] == true;
        instaPayAddress.text = str(store['paymentInstaPayAddress']);
        walletNumber.text = str(store['paymentWalletNumber']);
        depositPercent.text = str(store['paymentDepositPercent']);
      }
      return Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
        field('اسم المتجر', name),
        ListTile(title: const Text('العملة'), subtitle: Text(str(store['currency']))),
        ListTile(title: const Text('المنطقة الزمنية'), subtitle: Text(str(store['timezone']))),
        field('تكلفة المرتجع الافتراضية (EGP)', amount, type: TextInputType.number),
        SwitchListTile(title: const Text('إظهار التكلفة التقديرية'),
          value: costing, onChanged: widget.isOwner ? (value) => setState(() => costing = value) : null),
        const Divider(height: 32),
        const ListTile(title: Text('طرق الدفع الإلكتروني'), subtitle: Text('إدارة InstaPay والمحفظة ونسبة العربون')),
        SwitchListTile(title: const Text('تفعيل InstaPay'), value: instaPayEnabled,
          onChanged: widget.isOwner ? (value) => setState(() => instaPayEnabled = value) : null),
        field('عنوان InstaPay', instaPayAddress),
        SwitchListTile(title: const Text('تفعيل المحفظة الإلكترونية'), value: walletEnabled,
          onChanged: widget.isOwner ? (value) => setState(() => walletEnabled = value) : null),
        field('رقم المحفظة', walletNumber, type: TextInputType.phone),
        field('نسبة العربون (%)', depositPercent, type: TextInputType.number),
        if (widget.isOwner) FilledButton(onPressed: () async {
          final value = double.tryParse(amount.text);
          final percent = int.tryParse(depositPercent.text);
          if (percent == null || percent < 1 || percent > 99 || (walletNumber.text.isNotEmpty && !RegExp('^01[0125][0-9]{8}' + String.fromCharCode(36)).hasMatch(walletNumber.text)) || (instaPayEnabled && instaPayAddress.text.trim().isEmpty) || (walletEnabled && walletNumber.text.trim().isEmpty) || value == null || value < 0 || name.text.trim().length < 2) {
            showMessage(context, 'راجع اسم المتجر وتكلفة المرتجع'); return;
          }
          try { await perform(context, () => widget.api.put('/api/mobile/settings',
            {'name': name.text.trim(), 'defaultReturnCost': value, 'costingEnabled': costing,
              'paymentInstaPayEnabled': instaPayEnabled, 'paymentWalletEnabled': walletEnabled,
              'paymentInstaPayAddress': instaPayAddress.text.trim(), 'paymentWalletNumber': walletNumber.text.trim(),
              'paymentDepositPercent': percent})); }
          catch (_) { /* Error shown by helper. */ }
        }, child: const Text('حفظ الإعدادات')),
      ])));
    }),
  ]);
}
