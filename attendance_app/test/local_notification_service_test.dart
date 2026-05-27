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
}
