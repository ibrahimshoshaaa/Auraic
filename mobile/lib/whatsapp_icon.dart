import 'package:flutter/material.dart';

class WhatsAppIcon extends StatelessWidget {
  const WhatsAppIcon({super.key});
  @override
  Widget build(BuildContext context) => CustomPaint(size: const Size(28, 28), painter: _WhatsAppPainter());
}
class _WhatsAppPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 24, size.height / 24);
    final stroke = Paint()..color = Colors.white..style = PaintingStyle.stroke..strokeWidth = 1.5..strokeCap = StrokeCap.round..strokeJoin = StrokeJoin.round;
    final outline = Path()..moveTo(20.5, 11.7)..cubicTo(20.5, 18.2, 13.7, 22.2, 7.9, 19.2)..lineTo(3, 20.5)..lineTo(4.3, 15.7)..cubicTo(0.6, 8.2, 5.5, 3.2, 11.7, 3.2)..cubicTo(16.5, 3.2, 20.5, 7, 20.5, 11.7)..close();
    final phone = Path()..moveTo(8, 7.5)..cubicTo(7.2, 8.5, 7.5, 10.7, 9.8, 13)..cubicTo(12.1, 15.3, 14.3, 15.6, 15.3, 14.8)..lineTo(16.3, 13.4)..lineTo(13.7, 12.1)..lineTo(12.7, 13.1)..cubicTo(11.5, 12.6, 10.4, 11.5, 9.9, 10.3)..lineTo(10.9, 9.3)..lineTo(9.4, 6.7)..close();
    canvas.drawPath(outline, stroke); canvas.drawPath(phone, stroke);
  }
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
