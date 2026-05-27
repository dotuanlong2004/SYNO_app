import 'package:flutter/material.dart';

class AppTheme {
  const AppTheme._();

  static const Color primaryColor = Color(0xFF0B2A6F);
  static const Color deepBlue = Color(0xFF071E52);
  static const Color accentBlue = Color(0xFF1E88FF);
  static const Color accentOrange = Color(0xFFF59E0B);
  static const Color successColor = Color(0xFF22C55E);
  static const Color errorColor = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color brandSurface = Color(0xFFEFF5FF);

  static const Color softWhite = Color(0xFFFFFFFF);
  static const Color lightGrayBackground = Color(0xFFF6F8FC);
  static const Color mutedText = textSecondary;
  static const Color primaryRed = deepBlue;
  static const Color primaryBlue = primaryColor;
  static const Color primaryOrange = primaryColor;
  static const Color primaryOrangeDark = deepBlue;
  static const Color skyBlue = accentBlue;

  static ThemeData get light {
    const colorScheme = ColorScheme.light(
      primary: primaryColor,
      secondary: accentBlue,
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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
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
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: softWhite,
        prefixIconColor: primaryColor,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFD8E2F4)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFD8E2F4)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: primaryColor, width: 1.6),
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
