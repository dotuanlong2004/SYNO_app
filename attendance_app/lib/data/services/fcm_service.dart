import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../../core/notifications/local_notification_service.dart';

class FcmService {
  FcmService({required Future<void> Function(String token) onTokenReceived})
    : _onTokenReceived = onTokenReceived;

  final Future<void> Function(String token) _onTokenReceived;

  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      await Firebase.initializeApp();
      await LocalNotificationService.initialize();

      final FirebaseMessaging messaging = FirebaseMessaging.instance;

      await messaging.requestPermission(alert: true, badge: true, sound: true);

      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        await _onTokenReceived(token);
      }

      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
        if (newToken.isNotEmpty) {
          await _onTokenReceived(newToken);
        }
      });

      FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
        await LocalNotificationService.showAttendanceNotification(message);
      });

      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        // Hook deep-link navigation here if needed.
      });

      _initialized = true;
    } catch (_) {
      // Keep app running in environments without real Firebase keys.
    }
  }
}
