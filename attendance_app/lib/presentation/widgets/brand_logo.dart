import 'package:flutter/material.dart';

class BrandLogo extends StatelessWidget {
  final double width;
  final double? height;
  final bool markOnly;

  const BrandLogo({
    super.key,
    double size = 160,
    this.height,
    bool showText = true,
  }) : width = size,
       markOnly = !showText;

  const BrandLogo.horizontal({
    super.key,
    this.width = 260,
    this.height,
  }) : markOnly = false;

  const BrandLogo.mark({
    super.key,
    double size = 96,
    this.height,
  }) : width = size,
       markOnly = true;

  @override
  Widget build(BuildContext context) {
    final asset = markOnly
        ? 'assets/brand/syno-logo-mark.png'
        : 'assets/brand/syno-logo-horizontal.png';

    return Image.asset(
      asset,
      width: width,
      height: height,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      semanticLabel: 'SYNO',
    );
  }
}
