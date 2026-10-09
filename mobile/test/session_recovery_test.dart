import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:perfume_erp/api.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const channel = MethodChannel('plugins.it_nomads.com/flutter_secure_storage');
  final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
  final calls = <String>[];
  String? savedToken;
  bool corruptRead = false;
  int corruptWrites = 0;
  PlatformException? otherReadError;

  setUp(() {
    calls.clear(); savedToken = null; corruptRead = false; corruptWrites = 0; otherReadError = null;
    messenger.setMockMethodCallHandler(channel, (call) async {
      calls.add(call.method);
      switch (call.method) {
        case 'read':
          if (otherReadError != null) throw otherReadError!;
          if (corruptRead) throw PlatformException(code: 'Exception encountered', message: 'read', details: 'javax.crypto.BadPaddingException: OPENSSL_internal:BAD_DECRYPT');
          return savedToken;
        case 'write':
          if (corruptWrites > 0) {
            corruptWrites--;
            throw PlatformException(code: 'Exception encountered', details: 'java.security.InvalidKeyException: Failed to unwrap key');
          }
          savedToken = (call.arguments as Map)['value'] as String;
          return null;
        case 'deleteAll':
          savedToken = null; corruptRead = false;
          return null;
        case 'delete':
          savedToken = null;
          return null;
      }
      throw StateError('Unexpected secure storage call: ${call.method}');
    });
  });
  tearDown(() => messenger.setMockMethodCallHandler(channel, null));

  ErpApi apiWithLogin() => ErpApi(client: MockClient((request) async {
    expect(request.url.path, '/api/mobile/auth/login');
    expect(request.headers.containsKey('Authorization'), isFalse);
    expect(jsonDecode(request.body)['email'], 'owner@example.com');
    return http.Response(jsonEncode({'data': {'token': 'fresh-token'}}), 200);
  }));

  test('restored corrupt session recovers at startup and fresh login persists', () async {
    corruptRead = true;
    final api = apiWithLogin();
    expect(await api.hasSession, isFalse);
    expect(calls, ['read', 'deleteAll']);
    await api.login('owner@example.com', 'password');
    expect(savedToken, 'fresh-token');
    expect(await api.hasSession, isTrue);
  });

  test('first login skips stale token reads and retries a corrupt write once', () async {
    corruptRead = true; corruptWrites = 1;
    await apiWithLogin().login('owner@example.com', 'password');
    expect(calls, ['write', 'deleteAll', 'write']);
    expect(savedToken, 'fresh-token');
  });

  test('valid session is retained and sent with authenticated requests', () async {
    savedToken = 'existing-token';
    final api = ErpApi(client: MockClient((request) async {
      expect(request.headers['Authorization'], 'Bearer existing-token');
      return http.Response('{"data": {}}', 200);
    }));
    expect(await api.hasSession, isTrue);
    await api.get('/api/mobile/settings');
    expect(calls, ['read', 'read']);
  });

  test('unrelated storage errors do not erase credentials', () async {
    otherReadError = PlatformException(code: 'storage_unavailable', message: 'Device locked');
    await expectLater(ErpApi().hasSession, throwsA(isA<PlatformException>()));
    expect(calls, ['read']);
  });

  test('persistent encryption failure stops after one retry', () async {
    corruptWrites = 2;
    await expectLater(apiWithLogin().login('owner@example.com', 'password'), throwsA(isA<PlatformException>()));
    expect(calls, ['write', 'deleteAll', 'write']);
  });
}
