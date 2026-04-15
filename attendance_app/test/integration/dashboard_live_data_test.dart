import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:attendance_app/data/auth/token_storage.dart';
import 'package:attendance_app/domain/auth/token_pair.dart';
import 'package:attendance_app/presentation/providers/dashboard_providers.dart';

class _InMemoryTokenStorage extends TokenStorage {
  TokenPair? _tokens;

  @override
  Future<void> save(TokenPair tokens) async {
    _tokens = tokens;
  }

  @override
  Future<TokenPair?> read() async {
    return _tokens;
  }

  @override
  Future<void> clear() async {
    _tokens = null;
  }
}

void main() {
  test('fetches real attendance logs through Riverpod data layer', () async {
    final container = ProviderContainer(
      overrides: [
        tokenStorageProvider.overrideWithValue(_InMemoryTokenStorage()),
      ],
    );
    addTearDown(container.dispose);

    final authApi = container.read(authApiProvider);
    final loginResult = await authApi.login(
      email: 'teacher1@school.local',
      password: 'Password@123',
    );

    await container.read(tokenStorageProvider).save(loginResult.tokens);
    await container.read(tokenSessionProvider).set(loginResult.tokens);

    final records = await container.read(attendanceHistoryProvider.future);

    expect(records, isNotEmpty);
    expect(records.first.studentId, isNotEmpty);
    expect(records.first.timestamp, isA<DateTime>());
  });
}
