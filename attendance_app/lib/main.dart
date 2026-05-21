import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app.dart';

// Firebase setup note:
// - Android: place google-services.json at android/app/google-services.json
// - iOS: place GoogleService-Info.plist at ios/Runner/GoogleService-Info.plist
// - Windows: Firebase không hỗ trợ, bỏ qua

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('vi', null);

  // Firebase đã xóa khỏi pubspec.yaml cho Windows
  // Sẽ thêm lại trong android/ios pubspec.yaml riêng
  runApp(const ProviderScope(child: AttendanceApp()));
}
