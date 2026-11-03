import 'package:flutter/material.dart';
import 'api.dart';
import 'ui.dart';

String trafficNumber(dynamic value, {int digits = 0}) {
  final number = num.tryParse('$value') ?? 0;
  return number.toStringAsFixed(digits).replaceFirst(RegExp(r'\.0+$'), '');
}
Json trafficMap(dynamic value) => value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
List<Json> trafficRows(dynamic value) => value is List ? value.map(trafficMap).toList() : <Json>[];

class TrafficPage extends StatefulWidget {
  const TrafficPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<TrafficPage> createState() => _TrafficPageState();
}

class _TrafficPageState extends State<TrafficPage> {
  int days = 7;
  late Future<dynamic> report = load();
  Future<dynamic> load() => widget.api.get('/api/reports/traffic?days=$days');
  void choose(int value) => setState(() { days = value; report = load(); });
  Future<void> refresh() async {
    final next = load(); setState(() => report = next);
    try { await next; } catch (_) { /* FutureBuilder shows retry and authorization errors. */ }
  }
  Widget section(String title, List<Widget> children) => Card(child: Padding(
    padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: appInk)), const SizedBox(height: 14), ...children])));
  String comparison(dynamic currentValue, dynamic previousValue, bool comparable) {
    if (!comparable) return 'المقارنة عند اكتمال فترة سابقة محفوظة';
    final current = num.tryParse('$currentValue') ?? 0;
    final previous = num.tryParse('$previousValue') ?? 0;
    if (previous == 0) return current == 0 ? 'بدون تغيير عن الفترة السابقة' : 'نشاط جديد؛ الفترة السابقة بلا زيارات';
    final percent = (current - previous) / previous * 100;
    return percent == 0 ? 'بدون تغيير عن الفترة السابقة' : '${percent > 0 ? '↑ زيادة' : '↓ انخفاض'} ${trafficNumber(percent.abs(), digits: 1)}٪ عن الفترة السابقة';
  }
  Widget metric(String label, dynamic value, String note, {bool dark = false, String? comparison}) => Card(
    color: dark ? const Color(0xff211b3d) : Colors.white,
    child: Padding(padding: const EdgeInsets.all(15), child: Column(crossAxisAlignment: CrossAxisAlignment.start,
      children: [Text(label, style: TextStyle(fontSize: 11, color: dark ? Colors.white70 : appMuted)),
        const SizedBox(height: 10), Text('$value', style: TextStyle(fontSize: 27, fontWeight: FontWeight.w800, color: dark ? Colors.white : appInk)),
        const SizedBox(height: 6), Text(note, style: TextStyle(fontSize: 10, color: dark ? Colors.white70 : appMuted)),
        if (comparison != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(comparison, style: TextStyle(fontSize: 10, color: dark ? const Color(0xffd4c4e4) : const Color(0xff726383))))])));
  Widget metrics(Json data) {
    final cards = [
      metric('الزيارات', trafficNumber(data['visits']), 'جلسات تصفح خلال الفترة', dark: true,
        comparison: comparison(data['visits'], data['previousVisits'], data['comparable'] == true)),
      metric('مشاهدات الصفحات', trafficNumber(data['views']), 'كل مرة تفتح فيها صفحة',
        comparison: comparison(data['views'], data['previousViews'], data['comparable'] == true)),
      metric('صفحات لكل زيارة', trafficNumber(data['averageDepth'], digits: 1), 'متوسط عمق التصفح'),
      metric('الوصول لإتمام الطلب', '${trafficNumber(data['checkoutShare'], digits: 1)}٪', 'جلسات فتحت صفحة إتمام الطلب'),
    ];
    return LayoutBuilder(builder: (context, size) {
      final columns = size.maxWidth > 700 ? 4 : size.maxWidth >= 300 && MediaQuery.textScalerOf(context).scale(14) <= 20 ? 2 : 1;
      return Column(children: [for (var start = 0; start < cards.length; start += columns) ...[
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [for (var i = start; i < start + columns && i < cards.length; i++) ...[
          if (i > start) const SizedBox(width: 10), Expanded(child: cards[i])]]), const SizedBox(height: 10)]]);
    });
  }
  Widget line(String label, String value) => Padding(padding: const EdgeInsets.symmetric(vertical: 9), child: Column(
    crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: const TextStyle(fontSize: 12, color: appMuted)),
      const SizedBox(height: 4), Text(value, style: const TextStyle(fontWeight: FontWeight.w700, color: appInk))]));
  Widget content(Json data) {
    final display = trafficMap(data['display']); final points = trafficRows(data['points']);
    final visits = num.tryParse('${data['visits']}') ?? 0;
    final peak = trafficMap(data['peak']);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text('${str(display['from'])} — ${str(display['to'])}', style: const TextStyle(fontSize: 11, color: appMuted)),
      const Text('المواعيد والرسم بتوقيت القاهرة', style: TextStyle(fontSize: 10, color: appMuted)),
      const SizedBox(height: 12), metrics(data),
      section(days == 1 ? 'حركة الزيارات بالساعات' : 'حركة الزيارات يومًا بيوم', [TrafficBars(key: ValueKey(days), points: points)]),
      const SizedBox(height: 14),
      section('الوصول لصفحات التسوق', [for (final stage in trafficRows(data['stages'])) ...[
        Row(children: [Expanded(child: Text(str(stage['label']), style: const TextStyle(fontSize: 12))),
          Text('${trafficNumber(stage['count'])} جلسة', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12))]),
        const SizedBox(height: 8), ClipRRect(borderRadius: BorderRadius.circular(5), child: LinearProgressIndicator(
          value: visits > 0 ? ((num.tryParse('${stage['count']}') ?? 0) / visits).clamp(0, 1).toDouble() : 0,
          minHeight: 5, backgroundColor: const Color(0xfff1edf6), color: const Color(0xffb9a56e))), const SizedBox(height: 18)],
        const Text('الخطوات ليست إجبارية؛ «اشتري الآن» قد يتجاوز صفحة السلة. فتح إتمام الطلب لا يعني تأكيد شراء.', style: TextStyle(fontSize: 11, color: appMuted))]),
      const SizedBox(height: 14), section('لمحة عن التصفح', [
        line('جلسات بصفحة واحدة', '${trafficNumber(data['singlePage'])} من ${trafficNumber(data['visits'])} جلسة'),
        line(days == 1 ? 'الساعة الأعلى في المشاهدات' : 'اليوم الأعلى في المشاهدات', peak.isEmpty ? 'لا توجد بيانات بعد' : '${str(peak['label'])} · ${trafficNumber(peak['views'])} مشاهدة'),
        line('آخر زيارة في الفترة', str(display['lastVisit']).isEmpty ? 'لا توجد زيارات' : str(display['lastVisit'])),
      ]),
      const SizedBox(height: 14), section('الصفحات الأكثر مشاهدة', [
        if (trafficRows(data['pages']).isEmpty) const Padding(padding: EdgeInsets.all(20), child: Text('لا توجد زيارات مسجلة في هذه الفترة بعد.')),
        for (final page in trafficRows(data['pages'])) Padding(padding: const EdgeInsets.only(bottom: 16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Text(str(page['label']), style: const TextStyle(fontWeight: FontWeight.w700))),
            const SizedBox(width: 8), Text('${trafficNumber(page['views'])} مشاهدة', style: const TextStyle(fontSize: 12))]),
          const SizedBox(height: 4), Text(str(page['path']), textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 10, color: appMuted)),
          const SizedBox(height: 6), Text('${trafficNumber(page['share'], digits: 1)}٪ من المشاهدات · ${trafficNumber(page['visits'])} جلسة', style: const TextStyle(fontSize: 11, color: appMuted)),
          Text('آخر فتح: ${str(page['lastSeenLabel'])}', style: const TextStyle(fontSize: 10, color: appMuted)),
          const SizedBox(height: 8), ClipRRect(borderRadius: BorderRadius.circular(5), child: LinearProgressIndicator(value: ((num.tryParse('${page['share']}') ?? 0) / 100).clamp(0, 1).toDouble(), minHeight: 4, backgroundColor: const Color(0xfff1edf6), color: const Color(0xffb9a56e))),
        ])),
      ]),
      const SizedBox(height: 14), Text('آخر تحديث: ${str(display['updatedAt'])}', style: const TextStyle(fontSize: 10, color: appMuted)),
      if (display['collectionStarted'] != null) Text('بدأ التسجيل: ${str(display['collectionStarted'])}', style: const TextStyle(fontSize: 10, color: appMuted)),
      const SizedBox(height: 12), const Card(child: ExpansionTile(title: Text('كيف تُحسب الأرقام؟', style: TextStyle(fontSize: 13)), childrenPadding: EdgeInsets.fromLTRB(16, 0, 16, 16), children: [Text(
        'الزيارة جلسة تصفح وليست شخصًا فريدًا. فتح تبويب جديد قد يبدأ جلسة أخرى، وقد تظهر الجلسة في أكثر من يوم. الفترات متحركة؛ أول وآخر عمود قد يغطيان جزءًا من يوم أو ساعة. المقارنة تظهر عند اكتمال تاريخ سابق ضمن آخر 90 يومًا. جلسات الصفحة الواحدة ليست معدل ارتداد. لوحة الإدارة مستبعدة من العد. أدوات الحظر قد تقلل الأرقام. لا يتم جمع الجهاز أو البلد أو مصدر الزيارة أو مدة التصفح.', style: TextStyle(fontSize: 11, height: 1.8))])),
    ]);
  }
  @override
  Widget build(BuildContext context) => RefreshIndicator(onRefresh: refresh, child: ListView(
    physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.all(16), children: [
      const PageIntro(title: 'زيارات الموقع', subtitle: 'إحصائيات زوار المتجر، وليست استخدام تطبيق الإدارة', icon: Icons.insights_outlined),
      const SizedBox(height: 14), Row(children: [Expanded(child: Wrap(spacing: 6, runSpacing: 4, children: [
        for (final entry in const {1:'٢٤ ساعة',7:'٧ أيام',30:'٣٠ يومًا',90:'٩٠ يومًا'}.entries)
          ChoiceChip(label: Text(entry.value, style: const TextStyle(fontSize: 12)), selected: days == entry.key, onSelected: (_) => choose(entry.key)),
      ])), IconButton(onPressed: refresh, tooltip: 'تحديث إحصائيات الزيارات', icon: const Icon(Icons.refresh))]),
      const SizedBox(height: 12), FutureBuilder<dynamic>(future: report, builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) return const SizedBox(height: 160, child: Center(child: CircularProgressIndicator()));
        if (snapshot.hasError) return Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(children: [
          const Icon(Icons.cloud_off_outlined, color: appMuted), const SizedBox(height: 10), Text('${snapshot.error}', textAlign: TextAlign.center),
          TextButton(onPressed: refresh, child: const Text('إعادة المحاولة'))])));
        final data = trafficMap(trafficMap(snapshot.data)['data']);
        if (data.isEmpty) return const Text('لا تتوفر بيانات التقرير الآن.');
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Align(alignment: AlignmentDirectional.centerStart, child: StatusPill(label: '${trafficNumber(data['active'])} جلسة خلال آخر ١٥ دقيقة')),
          const SizedBox(height: 12), content(data),
        ]);
      }),
    ]));
}

class TrafficBars extends StatefulWidget {
  const TrafficBars({required this.points, super.key});
  final List<Json> points;
  @override
  State<TrafficBars> createState() => _TrafficBarsState();
}
class _TrafficBarsState extends State<TrafficBars> {
  String metric = 'visits';
  int? selected;
  @override
  Widget build(BuildContext context) {
    final points = widget.points;
    if (points.isEmpty) return const Text('لا توجد بيانات للرسم.');
    final index = (selected ?? points.length - 1).clamp(0, points.length - 1).toInt();
    final point = points[index];
    final maximum = points.fold<double>(1, (max, item) { final value = num.tryParse('${item[metric]}')?.toDouble() ?? 0; return value > max ? value : max; });
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Wrap(spacing: 8, children: [for (final entry in const {'visits':'الزيارات','views':'المشاهدات'}.entries)
        ChoiceChip(label: Text(entry.value, style: const TextStyle(fontSize: 12)), selected: metric == entry.key, onSelected: (_) => setState(() => metric = entry.key))]),
      const Padding(padding: EdgeInsets.symmetric(vertical: 10), child: Text('اضغط على العمود لعرض أرقامه · اسحب أفقيًا لباقي الفترة', style: TextStyle(fontSize: 10, color: appMuted))),
      LayoutBuilder(builder: (context, constraints) => SingleChildScrollView(scrollDirection: Axis.horizontal,
        child: SizedBox(width: (points.length * 44.0).clamp(constraints.maxWidth, double.infinity).toDouble(), height: 170,
          child: Directionality(textDirection: TextDirection.ltr, child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            for (var i = 0; i < points.length; i++) Expanded(child: Semantics(
              button: true, selected: i == index, label: '${points[i]['label']}: ${trafficNumber(points[i]['visits'])} زيارة، ${trafficNumber(points[i]['views'])} مشاهدة',
              child: InkWell(onTap: () => setState(() => selected = i), borderRadius: BorderRadius.circular(6),
                child: Padding(padding: const EdgeInsets.symmetric(horizontal: 5), child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                  Expanded(child: Align(alignment: Alignment.bottomCenter, child: Container(width: 30,
                    height: ((num.tryParse('${points[i][metric]}') ?? 0) / maximum * 120).clamp(2, 120).toDouble(),
                    decoration: BoxDecoration(color: i == index ? const Color(0xff48335f) : const Color(0xffc0aedb), borderRadius: const BorderRadius.vertical(top: Radius.circular(5)))))),
                  const SizedBox(height: 8), SizedBox(height: 28, child: Text(str(points[i]['shortLabel']), textAlign: TextAlign.center, style: const TextStyle(fontSize: 9, color: appMuted))),
                ]))))),
          ]))))),
      const SizedBox(height: 12), Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xfff6f3f9), borderRadius: BorderRadius.circular(10)),
        child: Text('${str(point['label'])} · ${trafficNumber(point['visits'])} زيارة · ${trafficNumber(point['views'])} مشاهدة', style: const TextStyle(fontSize: 12))),
      ExpansionTile(tilePadding: EdgeInsets.zero, title: const Text('عرض الأرقام في جدول', style: TextStyle(fontSize: 12)), children: [
        for (final row in points) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [Expanded(child: Text(str(row['label']), style: const TextStyle(fontSize: 11))), Text('${trafficNumber(row['visits'])} زيارة · ${trafficNumber(row['views'])} مشاهدة', style: const TextStyle(fontSize: 11))])),
      ]),
    ]);
  }
}
