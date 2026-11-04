import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:perfume_erp/api.dart';
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() { FlutterSecureStorage.setMockInitialValues({'erp_mobile_session': 'test-session'}); });
  test('report downloads use the live original API, bearer auth and binary response', () async {
    final api = ErpApi(client: MockClient((request) async {
      expect(request.url.host, 'auraic.shotechsolutions.net');
      expect(request.headers['Authorization'], 'Bearer test-session');
      expect(request.url.queryParameters['format'], 'pdf');
      return http.Response.bytes([37, 80, 68, 70], 200, headers: {'content-type': 'application/pdf'});
    }));
    expect(await api.download('/api/reports/export?format=pdf&period=today'), [37, 80, 68, 70]);
  });
  test('missing export route reports an outdated server rather than fake empty data', () async {
    final api = ErpApi(client: MockClient((_) async => http.Response('<html>Not found</html>', 404)));
    await expectLater(api.download('/api/reports/export?format=pdf'), throwsA(isA<ApiException>().having((e) => e.message, 'message', contains('لا تدعم التصدير'))));
  });
}
