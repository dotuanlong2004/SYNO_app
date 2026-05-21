// ignore_for_file: avoid_print

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// Script tạo logo PNG cho Windows app
/// Chạy: dart tool/generate_logo.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Tạo logo 256x256
  final size = 256;
  final recorder = ui.PictureRecorder();
  final canvas = ui.Canvas(recorder);
  final painter = HNSLogoPainter();

  painter.paint(canvas, ui.Size(size.toDouble(), size.toDouble()));

  final picture = recorder.endRecording();
  final image = await picture.toImage(size, size);
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);

  if (byteData != null) {
    final bytes = byteData.buffer.asUint8List();
    final file = File('windows/runner/resources/app_icon.png');
    await file.writeAsBytes(bytes);
    print('✅ Logo saved to: ${file.absolute.path}');
    print('👉 Convert to ICO using: https://convertico.com/');
    print('👉 Then replace: windows/runner/resources/app_icon.ico');
  }
}

/// Painter vẽ logo HNSEDU
class HNSLogoPainter extends CustomPainter {
  @override
  void paint(ui.Canvas canvas, ui.Size size) {
    final center = ui.Offset(size.width / 2, size.height / 2);
    final scale = size.width / 100;

    // Nền trắng
    canvas.drawRect(
      ui.Rect.fromLTWH(0, 0, size.width, size.height),
      ui.Paint()..color = Colors.white,
    );

    // Vẽ vòng tròn nền đỏ
    canvas.drawCircle(
      center,
      45 * scale,
      ui.Paint()..color = const Color(0xFFC62828),
    );

    // Vẽ chữ HN ở giữa
    final textStyle = ui.TextStyle(
      color: Colors.white,
      fontSize: 35 * scale,
      fontWeight: ui.FontWeight.bold,
    );
    final paragraphStyle = ui.ParagraphStyle(
      textAlign: ui.TextAlign.center,
    );
    final paragraphBuilder = ui.ParagraphBuilder(paragraphStyle)
      ..pushStyle(textStyle)
      ..addText('HN');
    final paragraph = paragraphBuilder.build();
    paragraph.layout(ui.ParagraphConstraints(width: size.width));
    canvas.drawParagraph(
      paragraph,
      ui.Offset(0, center.dy - 15 * scale),
    );

    // Vẽ các ngôi sao nhỏ xung quanh
    final starPositions = [
      ui.Offset(center.dx - 35 * scale, center.dy - 30 * scale),
      ui.Offset(center.dx + 35 * scale, center.dy - 30 * scale),
      ui.Offset(center.dx - 40 * scale, center.dy),
      ui.Offset(center.dx + 40 * scale, center.dy),
    ];

    for (final pos in starPositions) {
      _drawStar(canvas, pos, 8 * scale, const Color(0xFFFFC107));
    }
  }

  void _drawStar(ui.Canvas canvas, ui.Offset center, double size, ui.Color color) {
    final path = ui.Path();
    final points = 5;
    final outerRadius = size;
    final innerRadius = size * 0.4;

    for (var i = 0; i < points * 2; i++) {
      final radius = i.isEven ? outerRadius : innerRadius;
      final angle = (i * 3.14159 / points) - 3.14159 / 2;
      final x = center.dx + radius * (i.isEven ? 1 : 1) * angle.cos();
      final y = center.dy + radius * angle.sin();

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();

    canvas.drawPath(
      path,
      ui.Paint()
        ..color = color
        ..style = ui.PaintingStyle.fill,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

extension on double {
  double cos() => this;
  double sin() => this;
}
