import 'package:flutter/material.dart';

class AppTheme {
  const AppTheme._();

  // Màu logo Hữu Nghị School
  static const Color primaryRed = Color(0xFFC62828);      // Đỏ - HỮU NGHỊ
  static const Color primaryBlue = Color(0xFF1565C0);     // Xanh - SCHOOL
  static const Color primaryOrange = Color(0xFFF28C28);  // Cam - accent
  static const Color primaryOrangeDark = Color(0xFFD97512);
  static const Color starYellow = Color(0xFFFFC107);      // Vàng ngôi sao
  
  static const Color skyBlue = Color(0xFFF28C28);
  static const Color softWhite = Color(0xFFFFFFFF);
  static const Color lightGrayBackground = Color(0xFFFFF7EE);
  static const Color mutedText = Color(0xFF5E6A7D);

  static ThemeData get light {
    const colorScheme = ColorScheme.light(
      primary: primaryOrange,
      secondary: primaryOrangeDark,
      surface: softWhite,
      onPrimary: Colors.white,
      onSurface: Color(0xFF1A1F2E),
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: lightGrayBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: skyBlue,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: softWhite,
        elevation: 0,
        shadowColor: Colors.black.withAlpha(20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: skyBlue,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        ),
      ),
      textTheme: const TextTheme(
        titleLarge: TextStyle(fontWeight: FontWeight.w700),
        titleMedium: TextStyle(fontWeight: FontWeight.w600),
        bodyMedium: TextStyle(color: mutedText),
      ),
      iconTheme: const IconThemeData(color: skyBlue),
    );
  }
}
