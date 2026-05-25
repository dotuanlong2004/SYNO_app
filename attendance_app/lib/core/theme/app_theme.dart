import 'package:flutter/material.dart';

class AppTheme {
  const AppTheme._();

  static const Color primaryColor = Color(0xFF1E88FF);
  static const Color deepBlue = Color(0xFF0D47A1);
  static const Color accentOrange = Color(0xFFFF9800);
  static const Color successColor = Color(0xFF22C55E);
  static const Color errorColor = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);

  static const Color softWhite = Color(0xFFFFFFFF);
  static const Color lightGrayBackground = Color(0xFFF8FAFC);
  static const Color mutedText = textSecondary;
  static const Color primaryRed = deepBlue;
  static const Color primaryBlue = primaryColor;
  static const Color primaryOrange = accentOrange;
  static const Color primaryOrangeDark = Color(0xFFF57C00);
  static const Color skyBlue = primaryColor;

  static ThemeData get light {
    const colorScheme = ColorScheme.light(
      primary: primaryColor,
      secondary: accentOrange,
      surface: softWhite,
      onPrimary: Colors.white,
      onSurface: textPrimary,
      error: errorColor,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: lightGrayBackground,
      appBarTheme: const AppBarTheme(
        backgroundColor: deepBlue,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: softWhite,
        elevation: 0,
        shadowColor: Colors.black.withAlpha(20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        margin: EdgeInsets.zero,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          minimumSize: const Size.fromHeight(52),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        ),
      ),
      textTheme: const TextTheme(
        titleLarge: TextStyle(fontWeight: FontWeight.w700),
        titleMedium: TextStyle(fontWeight: FontWeight.w600),
        bodyMedium: TextStyle(color: mutedText),
      ),
      iconTheme: const IconThemeData(color: primaryColor),
    );
  }
}
