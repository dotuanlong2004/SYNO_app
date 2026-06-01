import 'dart:io';

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
import '../../data/services/sse_service.dart';
import '../../domain/auth/auth_state.dart';
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

final sseServiceProvider = Provider<SseService>((ref) {
  return SseService(dio: ref.read(dioProvider));
});

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
    final tokenStorage = ref.read(tokenStorageProvider);
    final stored = await tokenStorage.read().timeout(
      const Duration(seconds: 1),
      onTimeout: () => null,
    );
    if (stored == null) {
      state = const AuthState.unauthenticated();
      return;
    }

    await ref.read(tokenSessionProvider).set(stored);

    // Đọc user profile đã lưu (có role đúng) thay vì decode JWT Supabase
    final restoredUser = await tokenStorage.readUser().timeout(
      const Duration(seconds: 1),
      onTimeout: () => null,
    );

    if (restoredUser == null || restoredUser.id.isEmpty) {
      // Fallback: chưa có user trong storage (session cũ trước khi update)
      // Xóa token cũ để buộc đăng nhập lại
      await tokenStorage.clear();
      state = const AuthState.unauthenticated();
      return;
    }

    state = AuthState.authenticated(restoredUser);
    _initializeFcm();
    _initializeSse();
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
    _initializeSse();
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
    _initializeSse();
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
        return 'Không thể kết nối máy chủ. Hãy kiểm tra backend tại ${ApiConfig.baseUrl} rồi thử lại.';
      }
      final statusCode = error.response?.statusCode;
      if (statusCode == 401) {
        return 'Email hoặc mật khẩu không đúng.';
      }
      if (statusCode != null) {
        return 'Đăng nhập thất bại (HTTP $statusCode).';
      }
    }
    return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }

  Future<void> signOut() async {
    final refresh = await _readRefreshToken();
    if (refresh != null && refresh.isNotEmpty) {
      try {
        await ref.read(authApiProvider).logout(refresh);
      } catch (_) {}
    }

    await ref.read(sseServiceProvider).disconnect();
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
    });
  }

  void _initializeSse() {
    Future<void>.microtask(() async {
      final token = await readAccessToken();
      if (token != null) {
        await ref.read(sseServiceProvider).connect(token);
      }
    });
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
  ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, (previous, next) {
    if (next.hasValue) {
      final data = next.value;
      if (data != null && data['data_type'] == 'attendance') {
        ref.invalidateSelf();
      }
    }
  });

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

/// Lắng nghe sự kiện SSE stream
final sseEventsProvider = StreamProvider.autoDispose<Map<String, dynamic>>((ref) {
  final sse = ref.watch(sseServiceProvider);
  return sse.events;
});

/// Polling fallback: refresh mỗi 10 giây (giảm từ 3 giây) khi chưa có SSE đẩy về
final parentLearningDataRefreshTickProvider =
    StreamProvider.autoDispose<DateTime>((ref) {
      return Stream<DateTime>.periodic(
        const Duration(seconds: 10),
        (_) => DateTime.now(),
      );
    });

final timetableProvider = FutureProvider<List<TimetableEntry>>((ref) async {
  ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, (previous, next) {
    if (next.hasValue) {
      final data = next.value;
      if (data != null && data['data_type'] == 'timetable') {
        ref.invalidateSelf();
      }
    }
  });

  final repository = ref.watch(timetableRepositoryProvider);
  return repository.fetchTimetable();
});

final feesDataSourceProvider = Provider<FeesRemoteDataSource>((ref) {
  final dio = ref.watch(dioProvider);
  return FeesRemoteDataSource(dio: dio);
});

final feeNoticesProvider = FutureProvider<List<FeeNotice>>((ref) async {
  ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, (previous, next) {
    if (next.hasValue) {
      final data = next.value;
      if (data != null && data['data_type'] == 'fee') {
        ref.invalidateSelf();
      }
    }
  });

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
  ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, (previous, next) {
    if (next.hasValue) {
      final data = next.value;
      if (data != null && data['data_type'] == 'announcement') {
        ref.invalidateSelf();
      }
    }
  });

  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchAnnouncements();
});

final eventsProvider = FutureProvider<List<AnnouncementItem>>((
  ref,
) async {
  ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, (previous, next) {
    if (next.hasValue) {
      final data = next.value;
      if (data != null && data['data_type'] == 'event') {
        ref.invalidateSelf();
      }
    }
  });

  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchEvents();
});

final chatMessagesProvider = FutureProvider<List<ChatMessage>>((ref) async {
  ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, (previous, next) {
    if (next.hasValue) {
      final data = next.value;
      if (data != null && data['data_type'] == 'chat') {
        ref.invalidateSelf();
      }
    }
  });

  final dataSource = ref.watch(parentFeaturesDataSourceProvider);
  return dataSource.fetchChatMessages();
});

final gradesProvider = FutureProvider<List<GradeRecord>>((ref) async {
  ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, (previous, next) {
    if (next.hasValue) {
      final data = next.value;
      if (data != null && data['data_type'] == 'grade') {
        ref.invalidateSelf();
      }
    }
  });

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
  ref.listen<AsyncValue<Map<String, dynamic>>>(sseEventsProvider, (previous, next) {
    if (next.hasValue) {
      final data = next.value;
      if (data != null && data['data_type'] == 'student') {
        ref.invalidateSelf();
      }
    }
  });

  final repository = ref.watch(studentsRepositoryProvider);
  return repository.fetchStudents();
});
