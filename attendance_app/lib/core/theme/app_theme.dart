import 'package:flutter/material.dart';

class AppTheme {
  const AppTheme._();

  static const Color skyBlue = Color(0xFF4A90E2);
  static const Color softWhite = Color(0xFFFFFFFF);
  static const Color lightGrayBackground = Color(0xFFF4F7FB);
  static const Color mutedText = Color(0xFF5E6A7D);

  static ThemeData get light {
    const colorScheme = ColorScheme.light(
      primary: skyBlue,
      secondary: skyBlue,
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
