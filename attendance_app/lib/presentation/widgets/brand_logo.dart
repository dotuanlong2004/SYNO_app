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

  const BrandLogo.horizontal({super.key, this.width = 260, this.height})
    : markOnly = false;

  const BrandLogo.mark({super.key, double size = 96, this.height})
    : width = size,
      markOnly = true;

  @override
  Widget build(BuildContext context) {
    final markSize = markOnly ? width : width * 0.24;
    final logoMark = Image.asset(
      'assets/brand/syno-logo-mark.png',
      width: markSize,
      height: height ?? markSize,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      semanticLabel: markOnly ? 'SYNO' : null,
    );

    if (markOnly) return logoMark;

    return Semantics(
      label: 'SYNO',
      child: SizedBox(
        width: width,
        height: height,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            logoMark,
            SizedBox(width: width * 0.04),
            Flexible(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'SYNO',
                      style: TextStyle(
                        fontSize: 40,
                        fontWeight: FontWeight.w900,
                        height: 0.9,
                        letterSpacing: 0,
                        color: Color(0xFF0B2A6F),
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'KẾT NỐI - ĐỒNG BỘ - PHÁT TRIỂN',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0,
                        color: Color(0xFF0B2A6F),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
