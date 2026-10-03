import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:perfume_erp/api.dart';
import 'package:perfume_erp/hero_video.dart';
import 'package:perfume_erp/product_images.dart';
void main() {
 testWidgets('hero video offers gallery upload, preview and removal', (tester) async {
  String value = 'https://example.com/hero.mp4';
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: HeroVideo(api: ErpApi(), initial: value, onChanged: (url) => value = url, onBusy: (_) {}))));
  expect(find.text('رفع فيديو من الجهاز'), findsOneWidget);
  expect(find.text('معاينة الفيديو'), findsOneWidget);
  await tester.tap(find.text('حذف')); await tester.pump();
  expect(value, ''); expect(find.text('معاينة الفيديو'), findsNothing);
 });
 testWidgets('banner images offer gallery upload alongside URL', (tester) async {
  await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child: ProductImages(api: ErpApi(), initial: const [], onChanged: (_) {}, onBusy: (_) {})))));
  expect(find.text('↑ رفع'), findsNWidgets(4));
 });
 test('video validation rejects empty and unsupported files before network', () async {
  final api = ErpApi();
  await expectLater(api.uploadHeroVideo([], 'hero.mp4'), throwsA(isA<ApiException>()));
  await expectLater(api.uploadHeroVideo([1], 'hero.exe'), throwsA(isA<ApiException>()));
 });
}
