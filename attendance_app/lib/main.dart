import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/notifications/fcm_service.dart';
import 'core/notifications/local_notification_service.dart';

// Firebase setup note:
// - Android: place google-services.json at android/app/google-services.json
// - iOS: place GoogleService-Info.plist at ios/Runner/GoogleService-Info.plist

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  await LocalNotificationService.showAttendanceNotification(message);
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Khởi tạo Firebase
  await Firebase.initializeApp();

  // Khởi tạo notification services
  await LocalNotificationService.initialize();
  await FCMService.initialize();

  // Đăng ký background message handler
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  runApp(const ProviderScope(child: AttendanceApp()));
}
