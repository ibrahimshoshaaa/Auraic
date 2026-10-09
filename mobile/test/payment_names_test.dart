import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/more.dart';

class PaymentNamesApi extends ErpApi {
  Map<String, dynamic>? saved;
  @override
  Future<dynamic> get(String path) async => {'data': {
    'name': 'Auraic', 'currency': 'EGP', 'timezone': 'Africa/Cairo',
    'defaultReturnCost': 95, 'costingEnabled': false,
    'paymentInstaPayEnabled': true, 'paymentWalletEnabled': true,
    'paymentInstaPayAddress': '01012345678', 'paymentWalletNumber': '01112345678',
    'paymentDepositAmount': 100, 'paymentInstaPayAccountName': 'InstaPay Owner',
    'paymentWalletAccountName': 'Wallet Owner',
  }};
  @override
  Future<dynamic> put(String path, Map<String, dynamic> body) async {
    expect(path, '/api/mobile/settings');
    saved = body;
    return {'data': {'saved': true}};
  }
}

void main() {
  testWidgets('payment names load, edit and save separately', (tester) async {
    tester.view.physicalSize = const Size(1000, 2600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final api = PaymentNamesApi();
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SettingsPage(api: api, isOwner: true, onAccount: () {}))));
    await tester.pumpAndSettle();
    final instaPay = find.widgetWithText(TextField, 'اسم صاحب حساب InstaPay');
    final wallet = find.widgetWithText(TextField, 'اسم صاحب المحفظة الإلكترونية');
    await tester.ensureVisible(instaPay);
    expect(tester.widget<TextField>(instaPay).controller!.text, 'InstaPay Owner');
    await tester.enterText(instaPay, '  New InstaPay Owner  ');
    await tester.ensureVisible(wallet);
    expect(tester.widget<TextField>(wallet).controller!.text, 'Wallet Owner');
    await tester.enterText(wallet, '  New Wallet Owner  ');
    await tester.ensureVisible(find.text('حفظ الإعدادات'));
    await tester.tap(find.text('حفظ الإعدادات'));
    await tester.pumpAndSettle();
    expect(api.saved!['paymentInstaPayAccountName'], 'New InstaPay Owner');
    expect(api.saved!['paymentWalletAccountName'], 'New Wallet Owner');
    expect(api.saved!['paymentDepositAmount'], 100);
  });
}
