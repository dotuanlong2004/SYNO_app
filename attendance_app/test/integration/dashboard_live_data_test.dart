import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:test/test.dart';

import 'package:attendance_app/data/auth/token_storage.dart';
import 'package:attendance_app/domain/auth/auth_user.dart';
import 'package:attendance_app/domain/auth/token_pair.dart';
import 'package:attendance_app/presentation/providers/dashboard_providers.dart';

class _InMemoryTokenStorage extends TokenStorage {
  TokenPair? _tokens;
  AuthUser? _user;

  @override
  Future<void> save(TokenPair tokens) async {
    _tokens = tokens;
  }

  @override
  Future<TokenPair?> read() async {
    return _tokens;
  }

  @override
  Future<void> saveUser(AuthUser user) async {
    _user = user;
  }

  @override
  Future<AuthUser?> readUser() async {
    return _user;
  }

  @override
  Future<void> clear() async {
    _tokens = null;
    _user = null;
  }
}

void main() {
  const runLiveBackendTests = bool.fromEnvironment('RUN_LIVE_BACKEND_TESTS');

  test('fetches real attendance logs through Riverpod data layer', () async {
    final container = ProviderContainer(
      overrides: [
        tokenStorageProvider.overrideWithValue(_InMemoryTokenStorage()),
      ],
    );
    addTearDown(container.dispose);

    final authApi = container.read(authApiProvider);
    final loginResult = await authApi.login(
      email: 'teacher1@school.edu',
      password: 'Password@123',
    );

    await container.read(tokenStorageProvider).save(loginResult.tokens);
    await container.read(tokenStorageProvider).saveUser(loginResult.user);
    await container.read(tokenSessionProvider).set(loginResult.tokens);

    final records = await container.read(attendanceHistoryProvider.future);

    expect(records, isA<List>());
    for (final record in records) {
      expect(record.studentId, isNotEmpty);
      expect(record.timestamp, isA<DateTime>());
    }
  }, skip: runLiveBackendTests ? false : 'Set RUN_LIVE_BACKEND_TESTS=true and start backend on port 3000 to run this live integration test.');
}
