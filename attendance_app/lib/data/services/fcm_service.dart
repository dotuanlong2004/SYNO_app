import 'dart:async';

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
  Timer? _tokenRetryTimer;
  String? _pendingToken;
  int _tokenRetryCount = 0;

  Future<void> initialize() async {
    if (_initialized) {
      await syncToken();
      return;
    }
    if (_initializing) return;
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

      await syncToken();

      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
        if (newToken.isNotEmpty) {
          await _sendTokenSafely(newToken);
        }
      });

      FirebaseMessaging.onMessage.listen((RemoteMessage message) async {
        await LocalNotificationService.showRemoteNotification(message);
        if ('${message.data['type'] ?? ''}'.toLowerCase() == 'attendance') {
          await _onAttendanceMessage?.call();
        }
      });

      FirebaseMessaging.onMessageOpenedApp.listen((
        RemoteMessage message,
      ) async {
        if ('${message.data['type'] ?? ''}'.toLowerCase() == 'attendance') {
          await _onAttendanceMessage?.call();
        }
      });

      _initialized = true;
    } catch (error, stackTrace) {
      debugPrint('FCM initialize failed: $error');
      debugPrintStack(stackTrace: stackTrace);
    } finally {
      _initializing = false;
    }
  }

  Future<void> syncToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null && token.isNotEmpty) {
        await _sendTokenSafely(token);
      }
    } catch (error, stackTrace) {
      debugPrint('FCM token sync failed: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  Future<bool> _sendTokenSafely(String token) async {
    try {
      await _onTokenReceived(token);
      _pendingToken = null;
      _tokenRetryCount = 0;
      _tokenRetryTimer?.cancel();
      _tokenRetryTimer = null;
      debugPrint('FCM token saved to SYNO backend (${token.length} chars)');
      return true;
    } catch (error, stackTrace) {
      debugPrint('FCM token save failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      _scheduleTokenRetry(token);
      return false;
    }
  }

  void _scheduleTokenRetry(String token) {
    if (_tokenRetryCount >= 6) return;

    _pendingToken = token;
    _tokenRetryTimer?.cancel();
    final delaySeconds = _tokenRetryCount < 2 ? 10 : 30;
    _tokenRetryCount += 1;
    _tokenRetryTimer = Timer(Duration(seconds: delaySeconds), () async {
      final retryToken = _pendingToken;
      if (retryToken != null && retryToken.isNotEmpty) {
        await _sendTokenSafely(retryToken);
      }
    });
  }
}
