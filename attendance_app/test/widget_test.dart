import 'package:attendance_app/app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Shows login when unauthenticated', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: AttendanceApp()));

    await tester.pump(const Duration(seconds: 2));
    expect(find.text('Đăng nhập hệ thống'), findsOneWidget);
  });
}
