import 'package:dio/dio.dart';

import '../../domain/auth/auth_user.dart';
import '../../domain/auth/login_result.dart';
import '../../domain/auth/parent_registration_result.dart';
import '../../domain/auth/token_pair.dart';

class AuthApi {
  AuthApi({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<LoginResult> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/auth/login',
      data: {'email': email, 'password': password},
    );

    final data = response.data ?? <String, dynamic>{};
    final userMap =
        (data['user'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};

    return LoginResult(
      user: AuthUser(
        id: '${userMap['id'] ?? ''}',
        email: '${userMap['email'] ?? email}',
        fullName: '${userMap['full_name'] ?? ''}',
        role: '${userMap['role'] ?? ''}',
      ),
      tokens: TokenPair(
        accessToken: '${data['access_token'] ?? ''}',
        refreshToken: '${data['refresh_token'] ?? ''}',
      ),
    );
  }

  Future<TokenPair> refresh(String refreshToken) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/auth/refresh',
      data: {'refresh_token': refreshToken},
    );

    final data = response.data ?? <String, dynamic>{};
    return TokenPair(
      accessToken: '${data['access_token'] ?? ''}',
      refreshToken: '${data['refresh_token'] ?? ''}',
    );
  }

  Future<ParentRegistrationResult> registerParent({
    required String fullName,
    required String emailOrPhone,
    required String password,
    required String studentLinkCode,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/auth/register-parent',
      data: {
        'full_name': fullName,
        'email_or_phone': emailOrPhone,
        'password': password,
        'link_code': studentLinkCode,
      },
    );

    final data = response.data ?? <String, dynamic>{};
    final userMap =
        (data['user'] as Map?)?.cast<String, dynamic>() ?? <String, dynamic>{};
    final studentMap =
        (data['student'] as Map?)?.cast<String, dynamic>() ??
        <String, dynamic>{};

    return ParentRegistrationResult(
      loginResult: LoginResult(
        user: AuthUser(
          id: '${userMap['id'] ?? ''}',
          email: '${userMap['email'] ?? emailOrPhone}',
          fullName: '${userMap['full_name'] ?? fullName}',
          role: '${userMap['role'] ?? 'parent'}',
        ),
        tokens: TokenPair(
          accessToken: '${data['access_token'] ?? ''}',
          refreshToken: '${data['refresh_token'] ?? ''}',
        ),
      ),
      studentName: '${studentMap['full_name'] ?? ''}',
    );
  }

  Future<void> logout(String refreshToken) async {
    await _dio.post<Map<String, dynamic>>(
      '/api/v1/auth/logout',
      data: {'refresh_token': refreshToken},
    );
  }

  Future<void> saveFcmToken(String token) async {
    await _dio.post<Map<String, dynamic>>(
      '/api/v1/users/fcm-token',
      data: {'fcm_token': token},
    );
  }
}
