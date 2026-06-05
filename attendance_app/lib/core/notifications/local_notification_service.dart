import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationDisplayText {
  const NotificationDisplayText({required this.title, required this.body});

  final String title;
  final String body;
}

class LocalNotificationService {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static const AndroidNotificationChannel _androidChannel =
      AndroidNotificationChannel(
        'syno_channel',
        'Thông báo SYNO',
        description: 'Thông báo thời gian thực từ SYNO',
        importance: Importance.max,
      );

  static Future<void> initialize() async {
    if (_initialized) return;

    const android = AndroidInitializationSettings('@mipmap/launcher_icon');
    const ios = DarwinInitializationSettings();
    const windows = WindowsInitializationSettings(
      appName: 'SYNO',
      appUserModelId: 'Com.AttendanceApp.Attendance',
      guid: 'a8f5c3d2-1b4e-4f6a-9c0d-ef1234567890',
    );
    const settings = InitializationSettings(
      android: android,
      iOS: ios,
      windows: windows,
    );

    await _plugin.initialize(settings: settings);
    final androidPlugin = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await androidPlugin?.createNotificationChannel(_androidChannel);
    await androidPlugin?.requestNotificationsPermission();

    _initialized = true;
  }

  static Future<bool> requestNotificationPermission() async {
    await initialize();
    final androidPlugin = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    final granted = await androidPlugin?.requestNotificationsPermission();
    if (granted != null) return granted;
    return areNotificationsEnabled();
  }

  static Future<bool> areNotificationsEnabled() async {
    await initialize();
    final androidPlugin = _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    final enabled = await androidPlugin?.areNotificationsEnabled();
    return enabled ?? true;
  }

  static NotificationDisplayText resolveDisplayText(Map<String, dynamic> data) {
    final type = '${data['type'] ?? ''}'.toLowerCase();
    switch (type) {
      case 'chat_message':
        return const NotificationDisplayText(
          title: 'Tin nhắn mới từ SYNO',
          body: 'Bạn có phản hồi mới từ nhà trường.',
        );
      case 'announcement':
        return const NotificationDisplayText(
          title: 'Thông báo mới từ SYNO',
          body: 'Nhà trường vừa gửi thông báo mới.',
        );
      default:
        return const NotificationDisplayText(
          title: 'Thông báo điểm danh',
          body: 'Có cập nhật điểm danh mới.',
        );
    }
  }

  static Future<void> showRemoteNotification(RemoteMessage message) async {
    await initialize();

    const androidDetails = AndroidNotificationDetails(
      'syno_channel',
      'Thông báo SYNO',
      channelDescription: 'Thông báo thời gian thực từ SYNO',
      importance: Importance.max,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
      windows: WindowsNotificationDetails(),
    );

    final fallback = resolveDisplayText(message.data);
    final title = message.notification?.title ?? fallback.title;
    final body = message.notification?.body ?? fallback.body;

    await _plugin.show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      notificationDetails: details,
    );
  }

  static Future<void> showPlainNotification({
    required String title,
    required String body,
  }) async {
    await initialize();

    const androidDetails = AndroidNotificationDetails(
      'syno_channel',
      'Thông báo SYNO',
      channelDescription: 'Thông báo thời gian thực từ SYNO',
      importance: Importance.max,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
      windows: WindowsNotificationDetails(),
    );

    await _plugin.show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      notificationDetails: details,
    );
  }

  static Future<void> showAttendanceNotification(RemoteMessage message) {
    return showRemoteNotification(message);
  }
}
