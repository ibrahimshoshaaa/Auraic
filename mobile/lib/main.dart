import 'dart:async';
import 'order_notifications.dart';
import 'package:flutter/material.dart';

import 'api.dart';
import 'account.dart';
import 'finance.dart';
import 'inventory.dart';
import 'materials.dart';
import 'more.dart';
import 'orders.dart';
import 'products.dart';
import 'recipes.dart';
import 'ui.dart';
import 'storefront.dart';
import 'coupons.dart';
import 'customers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await OrderNotifications.instance.initialize();
  runApp(const PerfumeErpApp());
}

class PerfumeErpApp extends StatefulWidget {
  const PerfumeErpApp({super.key});

  @override
  State<PerfumeErpApp> createState() => _PerfumeErpAppState();
}

class _PerfumeErpAppState extends State<PerfumeErpApp> {
  final api = ErpApi();
  bool? signedIn;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final session = api.hasSession;
    await Future<void>.delayed(const Duration(milliseconds: 1300));
    final value = await session;
    if (mounted) setState(() => signedIn = value);
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Auraic',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xff191735),
            primary: const Color(0xff191735),
            surface: Colors.white,
          ),
          scaffoldBackgroundColor: appCanvas,
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xff191735),
            foregroundColor: Colors.white,
            elevation: 0,
            scrolledUnderElevation: 0,
            centerTitle: false,
          ),
          cardTheme: CardThemeData(
            color: Colors.white,
            elevation: 1,
            shadowColor: const Color(0xffd7e0e7),
            margin: EdgeInsets.zero,
            shape: RoundedRectangleBorder(
              side: const BorderSide(color: Color(0xffe5eae6)),
              borderRadius: BorderRadius.circular(20),
            ),
          ),
          filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(
            minimumSize: const Size(0, 48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          )),
          outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          )),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: Color(0xffdce4de)),
            ),
          ),
          navigationBarTheme: const NavigationBarThemeData(
            backgroundColor: Colors.white,
            indicatorColor: Color(0xffdceaf1)),
          useMaterial3: true,
        ),
        builder: (context, child) => Directionality(
          textDirection: TextDirection.rtl,
          child: child!,
        ),
        home: signedIn == null
            ? const AuraicSplash()
            : signedIn!
                ? ErpHome(api: api, onLogout: () => setState(() => signedIn = false))
                : LoginPage(api: api, onLogin: () => setState(() => signedIn = true)),
      );
}

class AuraicSplash extends StatelessWidget {
  const AuraicSplash({super.key});

  @override
  Widget build(BuildContext context) => const Scaffold(
    backgroundColor: Color(0xff191735),
    body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(width: 300, height: 190, child: Image(
        image: AssetImage('assets/auraic-logo.jpg'), fit: BoxFit.cover)),
      SizedBox(height: 26),
      SizedBox(width: 76, child: LinearProgressIndicator(
        minHeight: 2, color: Color(0xffffe8a1),
        backgroundColor: Color(0x44ffe8a1))),
    ])),
  );
}

class LoginPage extends StatefulWidget {
  const LoginPage({required this.api, required this.onLogin, super.key});
  final ErpApi api;
  final VoidCallback onLogin;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool busy = false;
  String? error;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> submit() async {
    setState(() { busy = true; error = null; });
    try {
      await widget.api.login(email.text, password.text);
      if (mounted) widget.onLogin();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(child: LayoutBuilder(builder: (context, viewport) =>
      SingleChildScrollView(child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: viewport.maxHeight),
        child: Column(children: [
          Container(width: double.infinity, padding: const EdgeInsets.fromLTRB(28, 48, 28, 50),
            decoration: const BoxDecoration(color: Color(0xff191735),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(32))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Center(child: SizedBox(width: 300, height: 170,
                child: Image(image: AssetImage('assets/auraic-logo.jpg'),
                  fit: BoxFit.cover))),
              const SizedBox(height: 10),
              const Center(child: Text('إدارة Auraic في مكان واحد',
                style: TextStyle(color: Color(0xffffe8a1), fontSize: 15))),
            ])),
          Padding(padding: const EdgeInsets.fromLTRB(20, 28, 20, 28),
            child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420),
              child: Card(child: Padding(padding: const EdgeInsets.all(22),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  const Text('أهلًا بعودتك', style: TextStyle(fontSize: 24,
                    fontWeight: FontWeight.w800, color: Color(0xff142720))),
                  const SizedBox(height: 4),
                  const Text('سجّل دخولك لمتابعة الطلبات والمخزون',
                    style: TextStyle(color: Color(0xff718079))),
                  const SizedBox(height: 24),
                  TextField(controller: email, keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: 'البريد الإلكتروني',
                      prefixIcon: Icon(Icons.mail_outline_rounded))),
                  const SizedBox(height: 14),
                  TextField(controller: password, obscureText: true,
                    autofillHints: const [AutofillHints.password],
                    onSubmitted: (_) { if (!busy) submit(); },
                    decoration: const InputDecoration(labelText: 'كلمة المرور',
                      prefixIcon: Icon(Icons.lock_outline_rounded))),
                  if (error != null) Padding(padding: const EdgeInsets.only(top: 16),
                    child: Text(error!, style: TextStyle(
                      color: Theme.of(context).colorScheme.error))),
                  const SizedBox(height: 24),
                  FilledButton(onPressed: busy ? null : submit,
                    child: Padding(padding: const EdgeInsets.symmetric(vertical: 7),
                      child: busy ? const SizedBox(height: 20, width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2,
                          color: Colors.white))
                        : const Text('تسجيل الدخول', style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.w700)))),
                ]))))),
        ]),
      )),
    )),
  );
}

class ErpHome extends StatefulWidget {
  const ErpHome({required this.api, required this.onLogout, super.key});
  final ErpApi api;
  final VoidCallback onLogout;

  @override
  State<ErpHome> createState() => _ErpHomeState();
}

class _ErpHomeState extends State<ErpHome> {
  String? notificationOrderId;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      unawaited(OrderNotifications.instance.attach(widget.api, _openNotifiedOrder, (message, id) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message),
          duration: const Duration(seconds: 8), action: SnackBarAction(label: 'فتح الطلب',
            onPressed: () => _openNotifiedOrder(id))));
      }));
    });
  }
  void _openNotifiedOrder(String id) {
    if (mounted) setState(() { notificationOrderId = id; selected = 1; pageEpoch++; });
  }
  @override
  void dispose() { unawaited(OrderNotifications.instance.detach()); super.dispose(); }
  int selected = 0;
  int pageEpoch = 0;
  int drawerEpoch = 0;
  final scaffoldKey = GlobalKey<ScaffoldState>();
  late Future<dynamic> account = widget.api.get('/api/mobile/me');

  void switchTo(int index) {
    if (selected != index || notificationOrderId != null) setState(() { selected = index; notificationOrderId = null; });
  }
  void refreshAt(int index) => setState(() { selected = index; pageEpoch++; });

  @override
  Widget build(BuildContext context) {
    const titles = ['الرئيسية', 'الطلبات', 'المخزون', 'المنتجات', 'المصروفات',
      'المرتجعات', 'الوصفات', 'الاستهلاك', 'التقارير', 'الإعدادات',
      'المواد الخام', 'الموردون', 'إدارة الموقع', 'العملاء', 'الكوبونات'];
    const icons = [Icons.dashboard_outlined, Icons.receipt_long_outlined,
      Icons.warehouse_outlined, Icons.inventory_2_outlined, Icons.payments_outlined,
      Icons.undo_outlined, Icons.science_outlined, Icons.trending_down_outlined,
      Icons.bar_chart_outlined, Icons.settings_outlined,
      Icons.grain_outlined, Icons.local_shipping_outlined, Icons.storefront_outlined, Icons.people_outline, Icons.local_offer_outlined];
    return FutureBuilder<dynamic>(future: account, builder: (context, snapshot) {
      if (!snapshot.hasData) return Scaffold(body: snapshot.hasError
        ? Column(mainAxisSize: MainAxisSize.min, children: [Text('${snapshot.error}'),
          TextButton(onPressed: () => setState(() => account = widget.api.get('/api/mobile/me')),
            child: const Text('إعادة المحاولة')),
          TextButton(onPressed: widget.onLogout, child: const Text('تسجيل الدخول مجددًا'))])
        : const PageSkeleton());
      final user = json(snapshot.data['data']);
      final role = str(user['role']);
      final manager = role == 'OWNER' || role == 'MANAGER';
      final owner = role == 'OWNER';
      final visible = [0, 1, 2, if (manager) 3, if (manager) 4, if (manager) 5,
        if (manager) 6, 7, if (manager) 8, 9, 10, 11, if (manager) 12, if (manager) 13, if (manager) 14];
      Widget body = switch (selected) {
        0 => _Dashboard(api: widget.api, user: user, onSelect: switchTo,
          manager: manager),
        1 => OrdersPage(api: widget.api, canWrite: manager, orderId: notificationOrderId),
        2 => InventoryPage(api: widget.api, canWrite: manager),
        3 => ProductsPage(api: widget.api, canWrite: manager),
        4 => ExpensesPage(api: widget.api, canWrite: manager),
        5 => ReturnsPage(api: widget.api, canWrite: manager),
        6 => RecipesPage(api: widget.api, canWrite: manager),
        7 => ConsumptionPage(api: widget.api),
        8 => ReportsPage(api: widget.api),
        9 => SettingsPage(api: widget.api, isOwner: owner,
          onAccount: () => openPage(context, AccountPage(api: widget.api,
            isOwner: owner, onPasswordChanged: widget.onLogout))),
        10 => MaterialsPage(api: widget.api, canWrite: manager),
        12 => StorefrontPage(api: widget.api),
        13 => CustomersPage(api: widget.api),
        14 => CouponsPage(api: widget.api),
        _ => SuppliersPage(api: widget.api, canWrite: manager),
      };
      return Scaffold(
        key: scaffoldKey,
        onDrawerChanged: (open) { if (open) setState(() => drawerEpoch++); },
        appBar: AppBar(
          title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(selected == 0 ? 'Auraic' : titles[selected],
              maxLines: 1, overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
            if (selected == 0) const Text('لوحة التحكم',
              style: TextStyle(fontSize: 11, color: Color(0xffc8dce6))),
          ]),
          actions: [if (manager) IconButton(tooltip: 'التقارير',
            onPressed: () => switchTo(8),
            icon: const Icon(Icons.analytics_outlined))],
        ),
        drawer: Drawer(child: SafeArea(child: Column(children: [
          Padding(padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
            child: Row(children: [
              const CircleAvatar(radius: 22, backgroundColor: Color(0xff191735),
                child: Image(image: AssetImage('assets/auraic-icon.png'))),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start,
                children: [const Text('Auraic',
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700)),
                  Text(str(user['email']), maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Color(0xff718079)))])),
            ])),
          const Divider(height: 1),
          Expanded(child: _GroupedDrawerMenu(
            key: ValueKey(drawerEpoch), titles: titles, icons: icons,
            visible: visible, selected: selected,
            onSelect: (index) { Navigator.pop(context); switchTo(index); },
            onAccount: () { Navigator.pop(context); openPage(context,
              AccountPage(api: widget.api, isOwner: owner, onPasswordChanged: widget.onLogout)); },
          )),
          const Divider(height: 1),
          Padding(padding: const EdgeInsets.all(12), child: ListTile(
            leading: const Icon(Icons.logout_rounded), title: const Text('تسجيل الخروج'),
            onTap: () async { try { await widget.api.logout(); }
              finally { widget.onLogout(); } },
          )),
        ]))),
        body: KeyedSubtree(key: ValueKey('$selected-$pageEpoch'), child: body),
        bottomNavigationBar: NavigationBar(
          height: 68,
          backgroundColor: Colors.white,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          indicatorColor: const Color(0xffdceaf1),
          selectedIndex: selected == 0 ? 0 : selected == 1 ? 1
            : selected == 2 ? 3 : 4,
          onDestinationSelected: (index) {
            if (index == 2) {
              if (manager) {
                openPage<bool>(context, NewOrderPage(api: widget.api)).then((created) {
                  if (created == true && mounted) refreshAt(1);
                });
              } else {
                scaffoldKey.currentState?.openDrawer();
              }
              return;
            }
            if (index == 4) {
              scaffoldKey.currentState?.openDrawer();
              return;
            }
            switchTo(index == 3 ? 2 : index);
          },
          destinations: [
            const NavigationDestination(icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded), label: 'الرئيسية'),
            const NavigationDestination(icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long), label: 'الطلبات'),
            NavigationDestination(icon: Icon(manager ? Icons.add_circle_rounded
              : Icons.grid_view_rounded, size: 32, color: const Color(0xff123e57)),
              label: manager ? 'طلب جديد' : 'الأقسام'),
            const NavigationDestination(icon: Icon(Icons.warehouse_outlined),
              selectedIcon: Icon(Icons.warehouse), label: 'المخزون'),
            const NavigationDestination(icon: Icon(Icons.menu), label: 'المزيد'),
          ]),
      );
    });
  }
}

class _Dashboard extends StatefulWidget {
  const _Dashboard({required this.api, required this.user,
    required this.onSelect, required this.manager});
  final ErpApi api;
  final Json user;
  final ValueChanged<int> onSelect;
  final bool manager;
  @override
  State<_Dashboard> createState() => _DashboardState();
}

class _DashboardState extends State<_Dashboard> {
  String period = '7d';
  Json? cached;
  late Future<dynamic> report = load();
  DateTimeRange? customRange;
  String date(DateTime value) => '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';
  Future<dynamic> load() => widget.api.get('/api/mobile/home?period=$period${period == 'custom' && customRange != null ? '&from=${date(customRange!.start)}&to=${date(customRange!.end)}' : ''}');
  Future<void> custom() async {
    final picked = await showDateRangePicker(context: context, firstDate: DateTime(2020), lastDate: DateTime.now(), initialDateRange: customRange);
    if (picked != null) setState(() { customRange = picked; period = 'custom'; report = load(); });
  }
  void choose(String value) => setState(() { period = value; report = load(); });
  Future<void> addAndRefresh(Widget page) async {
    final saved = await openPage<bool>(context, page);
    if (saved == true && mounted) setState(() => report = load());
  }
  static const labels = {'today': 'اليوم', 'yesterday': 'أمس',
    '7d': 'آخر ٧ أيام', '30d': 'آخر ٣٠ يوم', '60d': 'آخر ٦٠ يوم', 'month': 'هذا الشهر',
    'lastMonth': 'الشهر الماضي'};

  Widget metric(String label, dynamic value, IconData icon, String currency,
      {bool money = false}) => Card(child: SizedBox(height: 112, child: Padding(
    padding: const EdgeInsets.all(15),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [Icon(icon, color: const Color(0xff5b5786), size: 19),
        const SizedBox(width: 7),
        Expanded(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontSize: 12, color: Color(0xff6d7481))))]),
      const Spacer(),
      Row(textDirection: TextDirection.ltr, crossAxisAlignment: CrossAxisAlignment.end,
        children: [Flexible(child: Text(statistic(value), maxLines: 1,
          overflow: TextOverflow.ellipsis, textDirection: TextDirection.ltr,
          style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w800,
            color: Color(0xff191735)))),
          if (money) Padding(padding: const EdgeInsets.only(left: 5, bottom: 3),
            child: Text(currency, style: const TextStyle(fontSize: 11,
              color: Color(0xff858998)))),
        ]),
    ]),
  )));

  Widget shortcut(String title, IconData icon, VoidCallback onTap) =>
    InkWell(onTap: onTap, borderRadius: BorderRadius.circular(16),
      child: Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 13),
        decoration: BoxDecoration(color: Colors.white,
          border: Border.all(color: const Color(0xffe5eae6)),
          borderRadius: BorderRadius.circular(16)),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 42, height: 42,
            decoration: BoxDecoration(color: const Color(0xfff0eef9),
              borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, size: 21, color: const Color(0xff191735))),
          const SizedBox(height: 10),
          Text(title, maxLines: 2, textAlign: TextAlign.center,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        ])));

  @override
  Widget build(BuildContext context) => FutureBuilder<dynamic>(
    future: report, builder: (context, snapshot) {
      if (snapshot.hasData) cached = json(snapshot.data['data']);
      if (cached == null) return snapshot.hasError
        ? Center(child: TextButton.icon(onPressed: () => setState(() => report = load()),
            icon: const Icon(Icons.refresh), label: const Text('تعذر التحميل · إعادة المحاولة')))
        : const PageSkeleton();
      final data = cached!;
      final sales = json(data['sales']);
      final cash = json(data['cash']);
      final returns = json(data['returns']);
      final expenses = json(data['expenses']);
      final currency = str(data['currency']);
      final profit = json(data['profit']);
      final roas = json(data['roas']);
      final name = str(widget.user['name']).trim();
      final quick = <(String, IconData, VoidCallback)>[
        if (widget.manager) ('منتج جديد', Icons.add_box_outlined,
          () => addAndRefresh(ProductManagePage(api: widget.api))),
        if (widget.manager) ('إضافة مخزون', Icons.add_home_work_outlined,
          () => addAndRefresh(StockForm(api: widget.api))),
        if (widget.manager) ('إضافة مصروف', Icons.add_card_outlined,
          () => addAndRefresh(ExpenseForm(api: widget.api))),
        ('الطلبات', Icons.receipt_long_outlined, () => widget.onSelect(1)),
        ('المخزون', Icons.warehouse_outlined, () => widget.onSelect(2)),
        if (widget.manager) ('المرتجعات', Icons.assignment_return_outlined,
          () => widget.onSelect(5)),
      ];
      final metrics = <(String, dynamic, IconData, bool)>[
        ('صافي الربح', profit['profit'] ?? 'غير مكتمل', Icons.show_chart, profit['profit'] != null),
        ('نسبة الربح', profit['margin'] == null ? '—' : '${profit['margin']}%', Icons.percent, false),
        ('الطلبات', sales['orders'], Icons.receipt_long_outlined, false),
        ('الوحدات المباعة', sales['units'], Icons.inventory_2_outlined, false),
        ('المرتجعات', returns['count'], Icons.assignment_return_outlined, false),
        ('المصروفات', expenses['total'], Icons.account_balance_wallet_outlined, true),
        ('الدفعات المستلمة', cash['received'], Icons.payments_outlined, true),
      ];
      return RefreshIndicator(onRefresh: () async {
        final next = load(); setState(() => report = next); await next;
      }, child: ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 24), children: [
        if (snapshot.connectionState == ConnectionState.waiting)
          const LinearProgressIndicator(minHeight: 2),
        if (snapshot.hasError) Padding(padding: const EdgeInsets.only(bottom: 8),
          child: TextButton.icon(onPressed: () => setState(() => report = load()),
            icon: const Icon(Icons.refresh), label: const Text('تعذر تحديث الفترة · إعادة المحاولة'))),
        Text('صباح الخير، ${name.isEmpty ? 'أهلًا بك' : name.split(' ').first}',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800,
            color: Color(0xff152b3c))),
        const SizedBox(height: 5),
        const Text('ملخص شغلك في الفترة المحددة',
          style: TextStyle(color: Color(0xff718079), fontSize: 12)),
        const SizedBox(height: 15),
        SizedBox(height: 48, child: ListView(scrollDirection: Axis.horizontal,
          children: [for (final key in labels.keys) Padding(
            padding: const EdgeInsetsDirectional.only(end: 8),
            child: ChoiceChip(label: Text(labels[key]!,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                color: period == key ? Colors.white : const Color(0xff191735))),
              showCheckmark: false,
              selectedColor: const Color(0xff191735),
              backgroundColor: Colors.white,
              side: const BorderSide(color: Color(0xffdedfe8)),
              selected: period == key, onSelected: (_) => choose(key)))])),
        TextButton.icon(onPressed: custom, icon: const Icon(Icons.date_range), label: Text(period == 'custom' && customRange != null ? '${date(customRange!.start)} – ${date(customRange!.end)}' : 'فترة مخصصة')),
        const SizedBox(height: 16),
        Container(padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: const Color(0xff191735),
            borderRadius: BorderRadius.circular(24)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [const Icon(Icons.trending_up_rounded,
              color: Color(0xffffe8a1), size: 22), const SizedBox(width: 8),
              const Text('إجمالي المبيعات', style: TextStyle(
                color: Color(0xffe3e1f0), fontSize: 15)),
              const Spacer(),
              Text(labels[period] ?? 'فترة مخصصة', style: const TextStyle(
                color: Color(0xffffe8a1), fontSize: 12))]),
            const SizedBox(height: 18),
            Row(textDirection: TextDirection.ltr,
              crossAxisAlignment: CrossAxisAlignment.end, children: [
              Flexible(child: Text(statistic(sales['total'] ?? (num.tryParse('${sales['gross']}') ?? 0) - (num.tryParse('${sales['discounts']}') ?? 0)), maxLines: 1,
                overflow: TextOverflow.ellipsis, textDirection: TextDirection.ltr,
                style: const TextStyle(color: Colors.white, fontSize: 36,
                  fontWeight: FontWeight.w800))),
              Padding(padding: const EdgeInsets.only(left: 8, bottom: 6),
                child: Text(currency, style: const TextStyle(
                  color: Color(0xffd2cde2), fontSize: 13))),
            ]),
          ])),
        const SizedBox(height: 12),
        LayoutBuilder(builder: (context, constraints) {
          final width = (constraints.maxWidth - 10) / 2;
          return Wrap(spacing: 10, runSpacing: 10, children: [
            for (final m in metrics) SizedBox(width: width,
              child: metric(m.$1, m.$2, m.$3, currency, money: m.$4)),
          ]);
        }),
        const SizedBox(height: 12),
        const Text('صافي الربح = سعر البيع بعد الخصم والاسترداد − تكلفة الوصفة، قبل المصروفات التشغيلية.', style: TextStyle(fontSize: 12, color: Color(0xff718079))),
        if (profit['incomplete'] == true || profit['estimated'] == true) Padding(padding: const EdgeInsets.symmetric(vertical: 12), child: Text(profit['incomplete'] == true ? '${profit['missingLines']} بند بدون تكلفة وصفة مكتملة. راجع تكلفة الخامات والاستهلاك.' : 'بعض المبيعات القديمة تكلفتها تقديرية. الطلبات الجديدة تحفظ تكلفة الخامات وقت التجهيز.', style: const TextStyle(color: Color(0xff956528), fontSize: 12))),
        Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('ROAS · عائد مصاريف السوشيال ميديا', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Text(roas['ratio'] == null ? '—' : '${roas['ratio']}×', textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: Color(0xff191735))),
          Text('مصاريف السوشيال: ${roas['spend']} $currency'),
          const SizedBox(height: 8),
          const Text('إجمالي مبيعات الفترة ÷ مجموع مصاريف السوشيال لنفس الفترة. يعتمد على كل مبيعات المتجر.', style: TextStyle(fontSize: 12, color: Color(0xff718079))),
          if (roas['ratio'] == null) const Text('سجّل مصاريف سوشيال في الفترة لعرض النسبة.', style: TextStyle(fontSize: 12)),
          if (widget.manager) TextButton(onPressed: () => addAndRefresh(ExpenseForm(api: widget.api)), child: const Text('تسجيل مصروف سوشيال')),
        ]))),
        const SizedBox(height: 22),
        const Text('عمليات سريعة', style: TextStyle(fontSize: 17,
          fontWeight: FontWeight.w800, color: Color(0xff152b3c))),
        const SizedBox(height: 10),
        if (widget.manager) Padding(padding: const EdgeInsets.only(bottom: 10),
          child: FilledButton.icon(
            onPressed: () => addAndRefresh(NewOrderPage(api: widget.api)),
            icon: const Icon(Icons.add_shopping_cart_outlined),
            label: const Padding(padding: EdgeInsets.symmetric(vertical: 9),
              child: Text('تسجيل طلب جديد', style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.w700))))),
        LayoutBuilder(builder: (context, constraints) {
          final width = (constraints.maxWidth - 20) / 3;
          return Wrap(spacing: 10, runSpacing: 10, children: [
            for (final q in quick) SizedBox(width: width,
              child: shortcut(q.$1, q.$2, q.$3)),
          ]);
        }),
        const SizedBox(height: 20),
        if (widget.manager) TextButton.icon(onPressed: () => widget.onSelect(8),
          icon: const Icon(Icons.analytics_outlined),
          label: const Text('عرض التقارير التفصيلية')),
      ]));
    });
}


class _GroupedDrawerMenu extends StatefulWidget {
  const _GroupedDrawerMenu({required this.titles, required this.icons,
    required this.visible, required this.selected, required this.onSelect,
    required this.onAccount, super.key});
  final List<String> titles;
  final List<IconData> icons;
  final List<int> visible;
  final int selected;
  final ValueChanged<int> onSelect;
  final VoidCallback onAccount;
  @override
  State<_GroupedDrawerMenu> createState() => _GroupedDrawerMenuState();
}

class _GroupedDrawerMenuState extends State<_GroupedDrawerMenu> {
  static const groups = [
    ('المنتجات والمخزون', Icons.inventory_2_outlined, [3, 2, 10, 6, 7]),
    ('الطلبات والمرتجعات', Icons.receipt_long_outlined, [1, 5]),
    ('العملاء والموردون', Icons.people_outline, [13, 11]),
    ('المالية والتقارير', Icons.account_balance_wallet_outlined, [4, 8]),
    ('الإدارة والإعدادات', Icons.settings_outlined, [12, 14, 9]),
  ];
  int? expanded;
  @override
  void initState() {
    super.initState();
    final current = groups.indexWhere((group) => group.$3.contains(widget.selected));
    expanded = current < 0 ? null : current;
  }
  Widget destination(int index) => ListTile(
    dense: true, visualDensity: VisualDensity.compact,
    leading: Icon(widget.icons[index], size: 20),
    title: Text(widget.titles[index], style: const TextStyle(fontSize: 14)),
    selected: widget.selected == index,
    selectedColor: const Color(0xff191735),
    selectedTileColor: const Color(0xffe5f0ea),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    onTap: () => widget.onSelect(index),
  );
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(12), children: [
      destination(0),
      const SizedBox(height: 8),
      for (var index = 0; index < groups.length; index++)
        if (index == 4 || groups[index].$3.any(widget.visible.contains)) ...[
          ListTile(
            dense: true, contentPadding: const EdgeInsets.symmetric(horizontal: 12),
            leading: Icon(groups[index].$2, size: 22),
            title: Text(groups[index].$1, style: TextStyle(fontSize: 14,
              fontWeight: groups[index].$3.contains(widget.selected)
                ? FontWeight.w700 : FontWeight.w600)),
            trailing: AnimatedRotation(turns: expanded == index ? .5 : 0,
              duration: const Duration(milliseconds: 200),
              child: const Icon(Icons.keyboard_arrow_down_rounded, size: 22)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onTap: () => setState(() => expanded = expanded == index ? null : index),
          ),
          AnimatedSize(duration: const Duration(milliseconds: 220),
            curve: Curves.easeInOut, alignment: Alignment.topCenter,
            child: expanded != index ? const SizedBox(width: double.infinity) : Padding(
              padding: const EdgeInsetsDirectional.only(start: 20, bottom: 8),
              child: Column(children: [
                for (final item in groups[index].$3)
                  if (widget.visible.contains(item)) destination(item),
                if (index == 4) ListTile(
                  dense: true, visualDensity: VisualDensity.compact,
                  leading: const Icon(Icons.manage_accounts_outlined, size: 20),
                  title: const Text('الحساب والأمان', style: TextStyle(fontSize: 14)),
                  onTap: widget.onAccount,
                ),
              ]),
            ),
          ),
          const SizedBox(height: 4),
        ],
    ],
  );
}
