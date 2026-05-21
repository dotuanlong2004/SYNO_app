import 'dart:math';

import 'package:flutter/material.dart';

/// Widget logo HUU NGHĪ SCHOOL
/// Vẽ lại logo bằng Flutter widgets (không cần ảnh)
class BrandLogo extends StatelessWidget {
  final double size;
  final bool showText;

  const BrandLogo({
    super.key,
    this.size = 120,
    this.showText = true,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Logo icon (ngôi sao + sách)
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 10,
                spreadRadius: 2,
              ),
            ],
          ),
          child: CustomPaint(
            size: Size(size, size),
            painter: _LogoPainter(),
          ),
        ),
        if (showText) ...[
          const SizedBox(height: 16),
          // Vẽ chữ HỮU NGHỊ SCHOOL
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Dòng 1: HỮU NGHỊ
              Text(
                'HỮU NGHỊ',
                style: TextStyle(
                  fontSize: size * 0.25,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFFC62828), // Đỏ
                  letterSpacing: 2,
                ),
              ),
              // Dòng 2: SCHOOL (nằm giữa)
              Text(
                'SCHOOL',
                style: TextStyle(
                  fontSize: size * 0.2,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF1565C0), // Xanh
                  letterSpacing: 4,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

/// Custom painter vẽ logo (sách mở + ngôi sao)
class _LogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final scale = size.width / 100;

    // Vẽ cuốn sách (xanh)
    final bookPath = Path()
      ..moveTo(center.dx - 30 * scale, center.dy + 20 * scale)
      ..lineTo(center.dx, center.dy + 35 * scale)
      ..lineTo(center.dx + 30 * scale, center.dy + 20 * scale)
      ..lineTo(center.dx + 30 * scale, center.dy - 5 * scale)
      ..lineTo(center.dx, center.dy + 10 * scale)
      ..lineTo(center.dx - 30 * scale, center.dy - 5 * scale)
      ..close();

    canvas.drawPath(
      bookPath,
      Paint()
        ..color = const Color(0xFF1565C0)
        ..style = PaintingStyle.fill,
    );

    // Vẽ ngôi sao vàng ở giữa
    _drawStar(canvas, center, 15 * scale, const Color(0xFFFFC107));

    // Vẽ các ngôi sao nhỏ theo vòng cung ở trên
    final starCount = 12;
    final radius = 38 * scale;
    final starSize = 5 * scale;
    
    for (var i = 0; i < starCount; i++) {
      // Góc từ -60 độ đến 240 độ (vòng cung ở trên)
      final angle = -60 * (pi / 180) + (i * 25 * (pi / 180));
      final x = center.dx + radius * cos(angle);
      final y = center.dy - 10 * scale + radius * sin(angle) * 0.6;
      _drawStar(canvas, Offset(x, y), starSize, const Color(0xFFC62828));
    }
  }

  void _drawStar(Canvas canvas, Offset center, double size, Color color) {
    final path = Path();
    final points = 5;
    final outerRadius = size;
    final innerRadius = size * 0.4;

    for (var i = 0; i < points * 2; i++) {
      final radius = i.isEven ? outerRadius : innerRadius;
      final angle = (i * pi / points) - pi / 2;
      final x = center.dx + radius * cos(angle);
      final y = center.dy + radius * sin(angle);
      
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();

    canvas.drawPath(
      path,
      Paint()
        ..color = color
        ..style = PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
