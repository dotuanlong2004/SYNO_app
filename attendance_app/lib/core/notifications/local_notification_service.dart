import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class LocalNotificationService {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static const AndroidNotificationChannel _androidChannel =
      AndroidNotificationChannel(
        'attendance_channel',
        'Attendance Notifications',
        description: 'Realtime attendance notifications',
        importance: Importance.max,
      );

  static Future<void> initialize() async {
    if (_initialized) return;

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    const windows = WindowsInitializationSettings(
      appName: 'Attendance App',
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
    await androidPlugin?.requestNotificationsPermission();
    await androidPlugin?.createNotificationChannel(_androidChannel);

    _initialized = true;
  }

  static Future<void> showAttendanceNotification(RemoteMessage message) async {
    await initialize();

    const androidDetails = AndroidNotificationDetails(
      'attendance_channel',
      'Attendance Notifications',
      channelDescription: 'Realtime attendance notifications',
      importance: Importance.max,
      priority: Priority.high,
    );

    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
      windows: WindowsNotificationDetails(),
    );

    final title = message.notification?.title ?? 'Thong bao diem danh';
    final body = message.notification?.body ?? 'Co cap nhat diem danh moi.';

    await _plugin.show(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      notificationDetails: details,
    );
  }
}
