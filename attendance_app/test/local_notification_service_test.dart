import 'package:attendance_app/core/notifications/local_notification_service.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('resolveDisplayText returns chat-specific fallback copy', () {
    final copy = LocalNotificationService.resolveDisplayText({
      'type': 'chat_message',
    });

    expect(copy.title, 'Tin nhắn mới từ SYNO');
    expect(copy.body, 'Bạn có phản hồi mới từ nhà trường.');
  });

  test('resolveDisplayText returns announcement-specific fallback copy', () {
    final copy = LocalNotificationService.resolveDisplayText({
      'type': 'announcement',
    });

    expect(copy.title, 'Thông báo mới từ SYNO');
    expect(copy.body, 'Nhà trường vừa gửi thông báo mới.');
  });

  test('notificationTagForData prefers backend notification key', () {
    final tag = LocalNotificationService.notificationTagForData({
      'type': 'attendance',
      'notification_key':
          'attendance:HS0085:check_in:2026-06-08T08:00:00.000Z',
      'student_code': 'HS0085',
    });

    expect(tag, 'attendance:HS0085:check_in:2026-06-08T08:00:00.000Z');
  });

  test('notificationIdForTag is stable for duplicate pushes', () {
    const tag = 'attendance:HS0085:check_in:2026-06-08T08:00:00.000Z';

    expect(
      LocalNotificationService.notificationIdForTag(tag),
      LocalNotificationService.notificationIdForTag(tag),
    );
  });
}
