import 'dart:convert';
import 'package:flutter/services.dart';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, this.status);
  final String message;
  final int status;
  @override
  String toString() => message;
}

class ErpApi {
  ErpApi({http.Client? client}) : _client = client ?? http.Client();

  static const _baseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://auraic.vercel.app');
  String get baseUrl => _baseUrl;
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'erp_mobile_session';
  final http.Client _client;

  Future<bool> get hasSession async => (await _readSessionToken()) != null;

  bool _isInvalidKey(PlatformException e) {
    final message = '${e.code} ${e.message} ${e.details}'.toLowerCase();
    return message.contains('bad_decrypt') ||
        message.contains('badpaddingexception') ||
        message.contains('invalidkeyexception') ||
        message.contains('keypermanentlyinvalidatedexception') ||
        message.contains('failed to unwrap key');
  }

  Future<String?> _readSessionToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } on PlatformException catch (e) {
      if (!_isInvalidKey(e)) rethrow;
      try { await _storage.deleteAll(); } catch (_) {}
      return null;
    }
  }

  Future<void> _saveSessionToken(String token) async {
    try {
      await _storage.write(key: _tokenKey, value: token);
    } on PlatformException catch (e) {
      if (!_isInvalidKey(e)) rethrow;
      try { await _storage.deleteAll(); } catch (_) {}
      throw const ApiException('تعذر حفظ جلسة الدخول. امسح بيانات التطبيق من إعدادات الهاتف ثم حاول مجددًا.', 500);
    }
  }

  Future<dynamic> get(String path) => _request('GET', path);

  Future<dynamic> post(String path, Map<String, dynamic> body) =>
      _request('POST', path, body: body);
  Future<dynamic> put(String path, Map<String, dynamic> body) =>
      _request('PUT', path, body: body);
  Future<dynamic> patch(String path, Map<String, dynamic> body) =>
      _request('PATCH', path, body: body);
  Future<dynamic> delete(String path) => _request('DELETE', path);

  Future<String> uploadProductImage(List<int> bytes, String filename) async {
    if (bytes.length > 3 * 1024 * 1024) throw const ApiException('اختر صورة حتى 3 ميجابايت', 422);
    final token = await _readSessionToken();
    final request = http.MultipartRequest('POST', Uri.parse('$_baseUrl/api/admin/storefront/images'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final response = await http.Response.fromStream(await _client.send(request).timeout(const Duration(seconds: 60)));
    dynamic decoded;
    try { decoded = jsonDecode(utf8.decode(response.bodyBytes)); }
    on FormatException { throw ApiException('تعذر قراءة رد رفع الصورة', response.statusCode); }
    if (response.statusCode >= 400) throw ApiException(decoded is Map ? decoded['error']?.toString() ?? 'تعذر رفع الصورة' : 'تعذر رفع الصورة', response.statusCode);
    return decoded['data']['url'].toString();
  }

  Future<String> uploadHeroVideo(List<int> bytes, String filename) async {
    if (bytes.isEmpty || bytes.length > 20 * 1024 * 1024 || !RegExp(r'\.(mp4|webm)$', caseSensitive: false).hasMatch(filename)) throw const ApiException('اختر فيديو MP4 أو WebM حتى 20 ميجابايت', 422);
    final signed = await post('/api/admin/storefront/video-signature', {});
    final data = signed['data'] as Map;
    final request = http.MultipartRequest('POST', Uri.parse(data['url'] as String));
    for (final entry in (data['fields'] as Map).entries) { request.fields['${entry.key}'] = '${entry.value}'; }
    request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
    final response = await http.Response.fromStream(await _client.send(request)).timeout(const Duration(minutes: 3));
    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    if (response.statusCode >= 400 || decoded['secure_url'] == null) throw ApiException(decoded['error']?['message']?.toString() ?? 'تعذر رفع الفيديو', response.statusCode);
    return decoded['secure_url'] as String;
  }

  Future<void> login(String email, String password) async {
    final result = await post('/api/mobile/auth/login', {
      'email': email.trim(),
      'password': password,
    }) as Map<String, dynamic>;
    final data = result['data'] as Map<String, dynamic>;
    await _saveSessionToken(data['token'] as String);
  }

  Future<void> logout() async {
    try {
      await post('/api/mobile/auth/logout', {});
    } finally {
      await _storage.delete(key: _tokenKey);
    }
  }

  Future<void> clearSession() => _storage.delete(key: _tokenKey);

  Future<dynamic> _request(String method, String path,
      {Map<String, dynamic>? body}) async {
    if (_baseUrl.isEmpty) throw const ApiException('اضبط API_BASE_URL أثناء بناء التطبيق للاستضافة الجديدة', 503);
    final token = await _readSessionToken();
    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    final uri = Uri.parse('$_baseUrl$path');
    final response = await (method == 'GET'
        ? _client.get(uri, headers: headers)
        : method == 'PATCH'
            ? _client.patch(uri, headers: headers, body: jsonEncode(body))
        : method == 'PUT'
            ? _client.put(uri, headers: headers, body: jsonEncode(body))
        : method == 'DELETE'
            ? _client.delete(uri, headers: headers)
            : _client.post(uri, headers: headers, body: jsonEncode(body)))
        .timeout(const Duration(seconds: 30));
    dynamic decoded;
    try {
      decoded = jsonDecode(utf8.decode(response.bodyBytes));
    } on FormatException {
      throw ApiException('تعذر قراءة رد السيرفر', response.statusCode);
    }
    if (response.statusCode >= 400) {
      if (response.statusCode == 401 && token != null) {
        await _storage.delete(key: _tokenKey);
      }
      throw ApiException(
          decoded is Map ? (decoded['error']?.toString() ?? 'حدث خطأ') : 'حدث خطأ',
          response.statusCode);
    }
    return decoded;
  }
}
