import 'package:dio/dio.dart';

import 'auth_interceptor.dart';

Dio buildDioClient({
  required String baseUrl,
  required Future<String?> Function() getAccessToken,
  required Future<String?> Function() getRefreshToken,
  required Future<void> Function(String access, String refresh)
  onTokensRefreshed,
  required Future<void> Function() onUnauthorized,
  required Future<Map<String, String>?> Function(String refreshToken)
  refreshTokens,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 12),
      sendTimeout: const Duration(seconds: 8),
      headers: const {
        'content-type': 'application/json',
        'accept': 'application/json',
      },
    ),
  );

  dio.interceptors.add(
    AuthInterceptor(
      getAccessToken: getAccessToken,
      getRefreshToken: getRefreshToken,
      onTokensRefreshed: onTokensRefreshed,
      onUnauthorized: onUnauthorized,
      refreshTokens: refreshTokens,
    ),
  );

  return dio;
}
