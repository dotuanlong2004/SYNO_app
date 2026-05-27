import 'dart:convert';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'local_notification_service.dart';

/// Service quản lý Firebase Cloud Messaging
/// - Lấy và cập nhật FCM token
/// - Xử lý foreground message
/// - Lưu token để backend gửi push notification
class FCMService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static String? _currentToken;

  /// Khởi tạo FCM service
  static Future<void> initialize() async {
    // Yêu cầu quyền notification trên iOS/Android 13+
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (kDebugMode) {
      print('FCM Permission: ${settings.authorizationStatus}');
    }

    // Lấy FCM token ban đầu
    await _updateToken();

    // Lắng nghe thay đổi token
    _messaging.onTokenRefresh.listen(_onTokenRefresh);

    // Xử lý foreground message
    FirebaseMessaging.onMessage.listen(_onForegroundMessage);
  }

  /// Lấy FCM token hiện tại
  static Future<String?> getToken() async {
    if (_currentToken == null) {
      await _updateToken();
    }
    return _currentToken;
  }

  /// Cập nhật token từ Firebase
  static Future<void> _updateToken() async {
    try {
      _currentToken = await _messaging.getToken();
      if (kDebugMode) {
        print('FCM Token: $_currentToken');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Lỗi lấy FCM token: $e');
      }
    }
  }

  /// Xử lý khi token thay đổi (cần gửi lên backend)
  static void _onTokenRefresh(String newToken) {
    _currentToken = newToken;
    if (kDebugMode) {
      print('FCM Token refreshed: $newToken');
    }
    // TODO: Gọi API để cập nhật token lên backend
    _sendTokenToBackend(newToken);
  }

  /// Xử lý foreground message (app đang mở)
  static Future<void> _onForegroundMessage(RemoteMessage message) async {
    if (kDebugMode) {
      print('Foreground message: ${message.notification?.title}');
    }

    // Hiển thị local notification
    await LocalNotificationService.showRemoteNotification(message);
  }

  /// Gửi token lên backend để lưu
  /// Backend sẽ dùng token này để gửi push notification khi có điểm danh
  static Future<void> _sendTokenToBackend(String token) async {
    try {
      // Lấy token từ storage
      final prefs = await SharedPreferences.getInstance();
      final authToken = prefs.getString('auth_token');

      if (authToken == null) {
        if (kDebugMode) {
          print('❌ Không có auth token, không thể gửi FCM token');
        }
        return;
      }

      // Gọi API để lưu FCM token
      final response = await http.post(
        Uri.parse('http://localhost:3000/api/v1/users/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: json.encode({'fcm_token': token}),
      );

      if (response.statusCode == 200) {
        if (kDebugMode) {
          print('✅ FCM token đã gửi lên backend thành công');
        }
      } else {
        if (kDebugMode) {
          print('❌ Lỗi gửi FCM token: ${response.statusCode}');
          print('Response body: ${response.body}');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('❌ Lỗi gửi FCM token: $e');
      }
    }
  }

  /// Xóa token (khi logout)
  static Future<void> deleteToken() async {
    await _messaging.deleteToken();
    _currentToken = null;
    if (kDebugMode) {
      print('FCM token đã xóa');
    }
  }

  /// Subscribe/unsubscribe topic
  static Future<void> subscribeToTopic(String topic) async {
    await _messaging.subscribeToTopic(topic);
  }

  static Future<void> unsubscribeFromTopic(String topic) async {
    await _messaging.unsubscribeFromTopic(topic);
  }
}
