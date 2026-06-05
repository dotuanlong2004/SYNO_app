import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import '../../core/notifications/local_notification_service.dart';

class FcmService {
  FcmService({
    required Future<void> Function(String token) onTokenReceived,
    Future<void> Function()? onAttendanceMessage,
  }) : _onTokenReceived = onTokenReceived,
       _onAttendanceMessage = onAttendanceMessage;

  final Future<void> Function(String token) _onTokenReceived;
  final Future<void> Function()? _onAttendanceMessage;

  bool _initialized = false;
  bool _initializing = false;

  Future<void> initialize() async {
    if (_initialized || _initializing) return;
    _initializing = true;

    try {
      await Firebase.initializeApp();
      await LocalNotificationService.initialize();

      final FirebaseMessaging messaging = FirebaseMessaging.instance;

      await LocalNotificationService.requestNotificationPermission();
      await messaging.requestPermission(alert: true, badge: true, sound: true);

      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      final token = await messaging.getToken();
      if (token != null && token.isNotEmpty) {
        await _sendTokenSafely(token);
      }

      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
        if (newToken.isNotEmpty) {
          await _sendTokenSafely(newToken);
        }
      });

      FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
        await LocalNotificationService.showRemoteNotification(message);
        await _onAttendanceMessage?.call();
      });

      FirebaseMessaging.onMessageOpenedApp.listen((
        RemoteMessage message,
      ) async {
        await _onAttendanceMessage?.call();
      });

      _initialized = true;
    } catch (error, stackTrace) {
      debugPrint('FCM initialize failed: $error');
      debugPrintStack(stackTrace: stackTrace);
    } finally {
      _initializing = false;
    }
  }

  Future<void> _sendTokenSafely(String token) async {
    try {
      await _onTokenReceived(token);
      debugPrint('FCM token saved to SYNO backend (${token.length} chars)');
    } catch (error, stackTrace) {
      debugPrint('FCM token save failed: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }
}
