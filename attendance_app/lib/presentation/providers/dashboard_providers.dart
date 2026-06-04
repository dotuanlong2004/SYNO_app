import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/notifications/local_notification_service.dart';
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
import '../../domain/auth/login_result.dart';
import '../../domain/auth/parent_registration_result.dart';
import '../../domain/auth/token_pair.dart';
import '../../domain/entities/attendance_record.dart';
import '../../domain/entities/announcement_item.dart';
import '../../domain/entities/chat_message.dart';
import '../../domain/entities/event_comment.dart';
import '../../domain/entities/fee_notice.dart';
import '../../domain/entities/grade_record.dart';
import '../../domain/entities/school_event_item.dart';
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
    onAttendanceMessage: () async {
      ref.invalidate(attendanceHistoryProvider);
    },
  );
});

class AuthController extends Notifier<AuthState> {
  static const Duration _attendancePollInterval = Duration(seconds: 5);

  bool _initialized = false;
  Timer? _attendancePollTimer;
  String? _lastAttendanceSignature;
  bool _attendancePollPrimed = false;

  @override
  AuthState build() {
    if (!_initialized) {
      _initialized = true;
      Future<void>.microtask(_initialize);
    }
    ref.onDispose(() {
      _attendancePollTimer?.cancel();
      _attendancePollTimer = null;
    });
    return const AuthState.unknown();
  }

  Future<void> _initialize() async {
    final tokenStorage = ref.read(tokenStorageProvider);
    final stored = await tokenStorage.read().timeout(
      const Duration(seconds: 5),
      onTimeout: () => null,
    );
    if (stored == null) {
      state = const AuthState.unauthenticated();
      return;
    }

    await ref.read(tokenSessionProvider).set(stored);

    // Đọc user profile đã lưu (có role đúng) thay vì decode JWT Supabase
    final restoredUser = await tokenStorage.readUser().timeout(
      const Duration(seconds: 5),
      onTimeout: () => null,
    );

    if (restoredUser == null || restoredUser.id.isEmpty) {
      try {
        final current = await ref
            .read(authApiProvider)
            .currentUser()
            .timeout(const Duration(seconds: 8));
        await tokenStorage.saveUser(current);
        state = AuthState.authenticated(current);
        _initializeFcm();
        return;
      } catch (_) {
        await tokenStorage.clear();
        state = const AuthState.unauthenticated();
        return;
      }
    }

    state = AuthState.authenticated(restoredUser);
    Future<void>.microtask(() async {
      try {
        final current = await ref
            .read(authApiProvider)
            .currentUser()
            .timeout(const Duration(seconds: 8));
        await tokenStorage.saveUser(current);
        if (ref.read(authControllerProvider).isAuthenticated) {
          state = AuthState.authenticated(current);
        }
      } catch (_) {
        // Giữ phiên đã lưu; interceptor sẽ refresh token khi API trả 401.
      }
    });
    _initializeFcm();
  }

  Future<bool> signIn({required String email, required String password}) async {
    try {
      final LoginResult result = await ref
          .read(authApiProvider)
          .login(email: email, password: password);
      await _persistTokens(result.tokens);
      await ref.read(tokenStorageProvider).saveUser(result.user);
      state = AuthState.authenticated(result.user);
      _initializeFcm();
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
    await ref.read(tokenStorageProvider).saveUser(result.loginResult.user);
    state = AuthState.authenticated(result.loginResult.user);
    _initializeFcm();
    return result;
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
        return 'Không thể kết nối máy chủ của SYNO. Vui lòng thử lại sau.';
      }
      final statusCode = error.response?.statusCode;
      if (statusCode == 401) {
        return 'Email hoặc mật khẩu không đúng.';
      }
      if (statusCode != null) {
        return 'Đăng nhập thất bại. Vui lòng thử lại.';
      }
    }
    return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }

  Future<void> signOut() async {
    _stopAttendancePolling();

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

  void _initializeFcm() {
    Future<void>.microtask(() async {
      await ref.read(fcmServiceProvider).initialize();
      _startAttendancePolling();
    });
  }

  void _startAttendancePolling() {
    if (_attendancePollTimer != null) return;

    Future<void>.microtask(_pollAttendanceBaseline);
    _attendancePollTimer = Timer.periodic(_attendancePollInterval, (_) {
      _pollAttendanceForUpdates();
    });
  }

  void _stopAttendancePolling() {
    _attendancePollTimer?.cancel();
    _attendancePollTimer = null;
    _lastAttendanceSignature = null;
    _attendancePollPrimed = false;
  }

  Future<void> _pollAttendanceBaseline() async {
    if (!_isAuthenticated) return;
    try {
      final records = await ref
          .read(attendanceRepositoryProvider)
          .fetchAttendanceHistory();
      _lastAttendanceSignature = _latestAttendanceSignature(records);
      _attendancePollPrimed = true;
      ref.invalidate(attendanceHistoryProvider);
    } catch (_) {
      // Polling is a fallback for local/dev push; never block the app on it.
    }
  }

  Future<void> _pollAttendanceForUpdates() async {
    if (!_isAuthenticated) return;

    try {
      final records = await ref
          .read(attendanceRepositoryProvider)
          .fetchAttendanceHistory();
      final latestSignature = _latestAttendanceSignature(records);
      if (latestSignature == null) {
        _lastAttendanceSignature = null;
        _attendancePollPrimed = true;
        return;
      }

      if (!_attendancePollPrimed) {
        _lastAttendanceSignature = latestSignature;
        _attendancePollPrimed = true;
        ref.invalidate(attendanceHistoryProvider);
        return;
      }

      if (latestSignature == _lastAttendanceSignature) return;

      _lastAttendanceSignature = latestSignature;
      ref.invalidate(attendanceHistoryProvider);
      await _showAttendanceUpdateNotification(records.first);
    } catch (_) {
      // Keep the last known state and retry on the next tick.
    }
  }

  bool get _isAuthenticated => state.isAuthenticated;

  String? _latestAttendanceSignature(List<AttendanceRecord> records) {
    if (records.isEmpty) return null;
    final latest = records.first;
    return '${latest.studentId}|${latest.timestamp.toIso8601String()}|${latest.logType.name}';
  }

  Future<void> _showAttendanceUpdateNotification(AttendanceRecord record) {
    final action = record.logType == AttendanceLogType.checkOut
        ? 'điểm danh ra'
        : 'điểm danh vào';
    final time = _formatVietnameseTime(record.timestamp);
    return LocalNotificationService.showPlainNotification(
      title: 'Thông báo điểm danh',
      body: '${record.studentId} đã $action lúc $time.',
    );
  }

  String _formatVietnameseTime(DateTime value) {
    String twoDigits(int number) => number.toString().padLeft(2, '0');
    return '${twoDigits(value.hour)}:${twoDigits(value.minute)} '
        '${twoDigits(value.day)}/${twoDigits(value.month)}/${value.year}';
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

final parentLearningDataRefreshTickProvider = Provider<int>((ref) => 0);

final timetableProvider = FutureProvider<List<TimetableEntry>>((ref) async {
  ref.watch(parentLearningDataRefreshTickProvider);
  final repository = ref.watch(timetableRepositoryProvider);
  return repository.fetchTimetable();
});

final feesDataSourceProvider = Provider<FeesRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return FeesRemoteDataSource(dio: dio);
});

final feeNoticesProvider = FutureProvider<List<FeeNotice>>((ref) async {
  ref.watch(parentLearningDataRefreshTickProvider);
  final dataSource = ref.watch(feesDataSourceProvider);
  return dataSource.fetchFeeNotices();
});

final parentFeaturesDataSourceProvider =
    Provider<ParentFeaturesRemoteDataSource>((ref) {
      final dio = ref.watch(dioProvider);
      return ParentFeaturesRemoteDataSource(dio: dio);
    });

final announcementsProvider = FutureProvider<List<AnnouncementItem>>((
  ref,
) async {
  ref.watch(parentLearningDataRefreshTickProvider);
  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchAnnouncements();
});

final eventsProvider = FutureProvider<List<SchoolEventItem>>((ref) async {
  ref.watch(parentLearningDataRefreshTickProvider);
  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchEvents();
});

final eventCommentsProvider =
    FutureProvider.family<List<EventComment>, int>((ref, eventId) async {
      final dataSource = ref.watch(parentFeaturesDataSourceProvider);
      return dataSource.fetchEventComments(eventId);
    });

final chatMessagesProvider = FutureProvider<List<ChatMessage>>((ref) async {
  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchChatMessages();
});

final gradesProvider = FutureProvider<List<GradeRecord>>((ref) async {
  ref.watch(parentLearningDataRefreshTickProvider);
  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchGrades();
});

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
