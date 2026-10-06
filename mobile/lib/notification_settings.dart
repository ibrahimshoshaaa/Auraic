import 'package:flutter/material.dart';
import 'api.dart';
import 'order_notifications.dart';
import 'ui.dart';

class NotificationSettingsPage extends StatefulWidget {
  const NotificationSettingsPage({required this.api, super.key});
  final ErpApi api;
  @override
  State<NotificationSettingsPage> createState() => _NotificationSettingsPageState();
}

class _NotificationSettingsPageState extends State<NotificationSettingsPage> {
  bool busy = true;
  bool enabled = false;
  String status = OrderNotifications.instance.status;
  @override
  void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    try {
      final result = await widget.api.get('/api/mobile/notifications') as Map;
      final data = result['data'] as Map;
      if (mounted) setState(() {
        enabled = data['enabled'] == true;
        if (enabled && data['serverConfigured'] != true) status = 'الجهاز مسجّل؛ إعداد السيرفر لم يكتمل';
        else if (enabled) status = 'إشعارات الطلبات مفعّلة على هذا الجهاز';
      });
    } catch (e) { if (mounted) setState(() => status = '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> _toggle(bool value) async {
    setState(() => busy = true);
    try {
      if (value) {
        enabled = await OrderNotifications.instance.enable(widget.api);
      } else {
        await OrderNotifications.instance.disable(widget.api); enabled = false;
      }
      status = OrderNotifications.instance.status;
    } catch (e) { if (mounted) showMessage(context, '$e'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('إشعارات الطلبات')),
    body: ListView(padding: const EdgeInsets.all(16), children: [
      const PageIntro(title: 'متابعة الطلبات الجديدة',
        subtitle: 'تنبيه عند وصول طلب، واضغط عليه لفتح الطلب مباشرة', icon: Icons.notifications_active_outlined),
      const SizedBox(height: 20),
      Card(child: SwitchListTile(title: const Text('إشعارات الطلبات على هذا الجهاز'),
        subtitle: Text(status), value: enabled, onChanged: busy ? null : _toggle)),
      const SizedBox(height: 12),
      const Text('اسمح بإشعارات Auraic من إعدادات الموبايل. أثناء استخدام التطبيق يظهر تنبيه داخله، وفي الخلفية يظهر إشعار الموبايل.'),
      if (busy) const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
    ]),
  );
}
