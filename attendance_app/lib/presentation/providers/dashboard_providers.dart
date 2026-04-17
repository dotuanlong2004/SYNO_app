import 'dart:io';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_config.dart';
import '../../core/network/dio_client.dart';
import '../../data/auth/auth_api.dart';
import '../../data/auth/token_session.dart';
import '../../data/auth/token_storage.dart';
import '../../data/datasources/attendance_remote_data_source.dart';
import '../../data/datasources/fees_remote_data_source.dart';
import '../../data/datasources/parent_features_remote_data_source.dart';
import '../../data/datasources/students_remote_data_source.dart';
import '../../data/datasources/timetable_remote_data_source.dart';
import '../../data/repositories/attendance_repository_impl.dart';
import '../../data/repositories/students_repository_impl.dart';
import '../../data/repositories/timetable_repository_impl.dart';
import '../../data/services/fcm_service.dart';
import '../../domain/auth/auth_state.dart';
import '../../domain/auth/auth_user.dart';
import '../../domain/auth/login_result.dart';
import '../../domain/auth/parent_registration_result.dart';
import '../../domain/auth/token_pair.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/entities/announcement_item.dart';
import '../../domain/entities/chat_message.dart';
import '../../domain/entities/fee_notice.dart';
import '../../domain/entities/grade_record.dart';
import '../../domain/entities/student_link_info.dart';
import '../../domain/entities/timetable_entry.dart';
import '../../domain/repositories/attendance_repository.dart';
import '../../domain/repositories/students_repository.dart';
import '../../domain/repositories/timetable_repository.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());
final tokenSessionProvider = Provider<TokenSession>(
  (ref) => TokenSession(null),
);

final authApiProvider = Provider<AuthApi>((ref) {
  final dio = Dio(BaseOptions(baseUrl: ApiConfig.baseUrl));
  return AuthApi(dio: dio);
});

final authControllerProvider = NotifierProvider<AuthController, AuthState>(
  AuthController.new,
);

class AuthController extends Notifier<AuthState> {
  bool _initialized = false;

  @override
  AuthState build() {
    if (!_initialized) {
      _initialized = true;
      Future<void>.microtask(_initialize);
    }
    return const AuthState.unknown();
  }

  Future<void> _initialize() async {
    final stored = await ref
        .read(tokenStorageProvider)
        .read()
        .timeout(const Duration(seconds: 1), onTimeout: () => null);
    if (stored == null) {
      state = const AuthState.unauthenticated();
      return;
    }

    await ref.read(tokenSessionProvider).set(stored);
    final restoredUser = _userFromAccessToken(stored.accessToken);
    state = AuthState.authenticated(restoredUser);
  }

  AuthUser _userFromAccessToken(String accessToken) {
    try {
      final parts = accessToken.split('.');
      if (parts.length != 3) {
        return const AuthUser(id: '', email: '', fullName: '', role: 'UNKNOWN');
      }

      final payloadBytes = base64Url.decode(base64Url.normalize(parts[1]));
      final payload =
          jsonDecode(utf8.decode(payloadBytes)) as Map<String, dynamic>;

      return AuthUser(
        id: '${payload['sub'] ?? ''}',
        email: '${payload['email'] ?? ''}',
        fullName: '${payload['full_name'] ?? ''}',
        role: '${payload['role'] ?? payload['user_role'] ?? 'UNKNOWN'}',
      );
    } catch (_) {
      return const AuthUser(id: '', email: '', fullName: '', role: 'UNKNOWN');
    }
  }

  Future<bool> signIn({required String email, required String password}) async {
    try {
      final LoginResult result = await ref
          .read(authApiProvider)
          .login(email: email, password: password);
      await _persistTokens(result.tokens);
      state = AuthState.authenticated(result.user);
      await _syncFcmTokenAfterAuth();
      return true;
    } catch (error) {
      state = AuthState.unauthenticated(_buildSignInErrorMessage(error));
      return false;
    }
  }

  Future<ParentRegistrationResult> registerParent({
    required String fullName,
    required String emailOrPhone,
    required String password,
    required String linkCode,
  }) async {
    final result = await ref
        .read(authApiProvider)
        .registerParent(
          fullName: fullName,
          emailOrPhone: emailOrPhone,
          password: password,
          studentLinkCode: linkCode,
        );
    await _persistTokens(result.loginResult.tokens);
    state = AuthState.authenticated(result.loginResult.user);
    await _syncFcmTokenAfterAuth();
    return result;
  }

  Future<void> _syncFcmTokenAfterAuth() async {
    try {
      await ref.read(fcmServiceProvider).initialize();
    } catch (_) {
      // Ignore token sync failures to avoid blocking auth flow.
    }
  }

  bool _isNetworkError(Object error) {
    if (error is! DioException) return false;
    return error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.error is SocketException;
  }

  String _buildSignInErrorMessage(Object error) {
    if (error is DioException) {
      if (_isNetworkError(error)) {
        return 'Cannot connect to server. Please start backend on ${ApiConfig.baseUrl} and try again.';
      }
      final statusCode = error.response?.statusCode;
      if (statusCode == 401) {
        return 'Incorrect email or password.';
      }
      if (statusCode != null) {
        return 'Sign in failed (HTTP $statusCode).';
      }
    }
    return 'Sign in failed. Please try again.';
  }

  Future<void> signOut() async {
    final refresh = await _readRefreshToken();
    if (refresh != null && refresh.isNotEmpty) {
      try {
        await ref.read(authApiProvider).logout(refresh);
      } catch (_) {}
    }

    await _clearTokens();
    state = const AuthState.unauthenticated();
  }

  Future<String?> readAccessToken() async {
    final inMemory = ref.read(tokenSessionProvider).accessToken;
    if (inMemory != null && inMemory.isNotEmpty) return inMemory;
    final stored = await ref
        .read(tokenStorageProvider)
        .read()
        .timeout(const Duration(seconds: 1), onTimeout: () => null);
    return stored?.accessToken;
  }

  Future<String?> _readRefreshToken() async {
    final inMemory = ref.read(tokenSessionProvider).refreshToken;
    if (inMemory != null && inMemory.isNotEmpty) return inMemory;
    final stored = await ref
        .read(tokenStorageProvider)
        .read()
        .timeout(const Duration(seconds: 1), onTimeout: () => null);
    return stored?.refreshToken;
  }

  Future<Map<String, String>?> tryRefreshToken() async {
    final refresh = await _readRefreshToken();
    if (refresh == null || refresh.isEmpty) return null;

    try {
      final TokenPair refreshed = await ref
          .read(authApiProvider)
          .refresh(refresh);
      await _persistTokens(refreshed);
      return {
        'access_token': refreshed.accessToken,
        'refresh_token': refreshed.refreshToken,
      };
    } catch (_) {
      await _clearTokens();
      state = const AuthState.unauthenticated();
      return null;
    }
  }

  Future<void> _persistTokens(TokenPair tokens) async {
    await ref.read(tokenStorageProvider).save(tokens);
    await ref.read(tokenSessionProvider).set(tokens);
  }

  Future<void> _clearTokens() async {
    await ref.read(tokenStorageProvider).clear();
    await ref.read(tokenSessionProvider).clear();
  }
}

final dioProvider = Provider<Dio>((ref) {
  return buildDioClient(
    baseUrl: ApiConfig.baseUrl,
    getAccessToken: () =>
        ref.read(authControllerProvider.notifier).readAccessToken(),
    getRefreshToken: () async => ref.read(tokenSessionProvider).refreshToken,
    onTokensRefreshed: (access, refresh) async {
      final tokens = TokenPair(accessToken: access, refreshToken: refresh);
      await ref.read(tokenStorageProvider).save(tokens);
      await ref.read(tokenSessionProvider).set(tokens);
    },
    onUnauthorized: () async {
      await ref.read(authControllerProvider.notifier).signOut();
    },
    refreshTokens: (refreshToken) async {
      return ref.read(authControllerProvider.notifier).tryRefreshToken();
    },
  );
});

final attendanceDataSourceProvider = Provider<AttendanceRemoteDataSource>((
  ref,
) {
  final dio = ref.watch(dioProvider);
  return AttendanceRemoteDataSource(dio: dio);
});

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  final dataSource = ref.watch(attendanceDataSourceProvider);
  return AttendanceRepositoryImpl(dataSource);
});

final attendanceHistoryProvider = FutureProvider<List<AttendanceRecord>>((
  ref,
) async {
  final repository = ref.watch(attendanceRepositoryProvider);
  return repository.fetchAttendanceHistory();
});

final timetableDataSourceProvider = Provider<TimetableRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return TimetableRemoteDataSource(dio: dio);
});

final timetableRepositoryProvider = Provider<TimetableRepository>((ref) {
  final dataSource = ref.watch(timetableDataSourceProvider);
  return TimetableRepositoryImpl(dataSource);
});

final timetableProvider = FutureProvider<List<TimetableEntry>>((ref) async {
  final repository = ref.watch(timetableRepositoryProvider);
  return repository.fetchTimetable();
});

final feesDataSourceProvider = Provider<FeesRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return FeesRemoteDataSource(dio: dio);
});

final feeNoticesProvider = FutureProvider<List<FeeNotice>>((ref) async {
  final dataSource = ref.watch(feesDataSourceProvider);
  return dataSource.fetchFeeNotices();
});

final parentFeaturesDataSourceProvider = Provider<ParentFeaturesRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return ParentFeaturesRemoteDataSource(dio: dio);
});

final announcementsProvider = FutureProvider<List<AnnouncementItem>>((ref) async {
  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchAnnouncements();
});

final gradesProvider = FutureProvider<List<GradeRecord>>((ref) async {
  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchGrades();
});

final chatMessagesProvider = FutureProvider<List<ChatMessage>>((ref) async {
  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchChatMessages();
});

final chatComposerProvider = NotifierProvider<ChatComposerController, bool>(
  ChatComposerController.new,
);

class ChatComposerController extends Notifier<bool> {
  @override
  bool build() => false;

  Future<void> sendMessage({
    required String messageText,
    String? studentCode,
  }) async {
    if (state) return;
    state = true;
    try {
      await ref.read(parentFeaturesDataSourceProvider).sendChatMessage(
        messageText: messageText,
        studentCode: studentCode,
      );
      ref.invalidate(chatMessagesProvider);
    } finally {
      state = false;
    }
  }
}

final studentsDataSourceProvider = Provider<StudentsRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return StudentsRemoteDataSource(dio: dio);
});

final studentsRepositoryProvider = Provider<StudentsRepository>((ref) {
  final dataSource = ref.watch(studentsDataSourceProvider);
  return StudentsRepositoryImpl(dataSource);
});

final studentsProvider = FutureProvider<List<StudentLinkInfo>>((ref) async {
  final repository = ref.watch(studentsRepositoryProvider);
  return repository.fetchStudents();
});

final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService(
    onTokenReceived: (token) async {
      await ref
          .read(dioProvider)
          .post<Map<String, dynamic>>(
            '/api/v1/users/fcm-token',
            data: {'fcm_token': token},
          );
    },
  );
});
