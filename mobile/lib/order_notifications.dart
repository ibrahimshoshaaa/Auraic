import 'dart:async';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api.dart';

@pragma('vm:entry-point')
Future<void> orderNotificationBackground(RemoteMessage message) async {
  await Firebase.initializeApp().timeout(const Duration(seconds: 10));
  // Notification payloads are displayed by Android while the app is backgrounded.
}

class OrderNotifications {
  static final instance = OrderNotifications();
  static const _storage = FlutterSecureStorage();
  static const _preference = 'auraic_order_notifications_enabled';
  bool ready = false;
  String status = 'الإشعارات لم تُفعّل بعد';
  StreamSubscription<String>? _tokens;
  StreamSubscription<RemoteMessage>? _opened;
  StreamSubscription<RemoteMessage>? _foreground;
  ErpApi? _api;
  void Function(String)? _openOrder;
  void Function(String, String)? _showMessage;
  String? _pendingOrder;
  int _epoch = 0;

  Future<void> initialize() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      await Firebase.initializeApp().timeout(const Duration(seconds: 10));
      FirebaseMessaging.onBackgroundMessage(orderNotificationBackground);
      ready = true;
      final message = await FirebaseMessaging.instance.getInitialMessage();
      if (message?.data['type'] == 'new_order') _pendingOrder = message!.data['orderId'];
    } catch (_) { status = 'إعداد Firebase الخاص بالتطبيق غير مكتمل'; }
  }

  Future<void> attach(ErpApi api, void Function(String) openOrder,
      void Function(String, String) showMessage) async {
    await detach();
    _api = api;
    _openOrder = openOrder;
    _showMessage = showMessage;
    if (!ready) return;
    _opened = FirebaseMessaging.onMessageOpenedApp.listen(_handleOpen);
    _foreground = FirebaseMessaging.onMessage.listen((message) {
      final id = message.data['orderId'];
      if (message.data['type'] == 'new_order' && id != null) {
        _showMessage?.call(message.notification?.body ?? 'وصلك طلب جديد', id);
      }
    });
    _tokens = FirebaseMessaging.instance.onTokenRefresh.listen((token) async {
      try {
        if (await _storage.read(key: _preference) != 'false' && _api != null) {
          await _api!.post('/api/mobile/notifications', {'token': token});
        }
      } catch (_) { status = 'تعذر تسجيل الجهاز، جرّب تفعيل الإشعارات مجددًا'; }
    });
    if (_pendingOrder != null) { _openOrder?.call(_pendingOrder!); _pendingOrder = null; }
    if (await _storage.read(key: _preference) != 'false') await enable(api);
  }

  void _handleOpen(RemoteMessage message) {
    final id = message.data['orderId'];
    if (message.data['type'] == 'new_order' && id != null) _openOrder?.call(id);
  }

  Future<bool> enable(ErpApi api) async {
    if (!ready) return false;
    final epoch = _epoch;
    try {
      final permission = await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
      if (permission.authorizationStatus != AuthorizationStatus.authorized &&
          permission.authorizationStatus != AuthorizationStatus.provisional) {
        status = 'اسمح بإشعارات Auraic من إعدادات الموبايل ثم جرّب مجددًا';
        return false;
      }
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null || epoch != _epoch) return false;
      final response = await api.post('/api/mobile/notifications', {'token': token}) as Map;
      if (epoch != _epoch) return false;
      await _storage.write(key: _preference, value: 'true');
      status = (response['data'] as Map)['serverConfigured'] == true
        ? 'إشعارات الطلبات مفعّلة على هذا الجهاز'
        : 'الجهاز مسجّل؛ إعداد إرسال الإشعارات على السيرفر لم يكتمل';
      return true;
    } catch (_) { status = 'تعذر تفعيل الإشعارات، راجع الإنترنت وحاول مجددًا'; return false; }
  }

  Future<void> disable(ErpApi api) async {
    _epoch++;
    await _storage.write(key: _preference, value: 'false');
    if (ready) await FirebaseMessaging.instance.deleteToken();
    await api.delete('/api/mobile/notifications');
    status = 'إشعارات الطلبات متوقفة على هذا الجهاز';
  }

  Future<void> detach() async {
    _epoch++;
    _api = null; _openOrder = null; _showMessage = null;
    await _tokens?.cancel(); await _opened?.cancel(); await _foreground?.cancel();
    _tokens = null; _opened = null; _foreground = null;
  }
}
