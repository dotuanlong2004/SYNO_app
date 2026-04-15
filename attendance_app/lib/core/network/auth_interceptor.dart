import 'package:dio/dio.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required Future<String?> Function() getAccessToken,
    required Future<String?> Function() getRefreshToken,
    required Future<void> Function(String access, String refresh)
    onTokensRefreshed,
    required Future<void> Function() onUnauthorized,
    required Future<Map<String, String>?> Function(String refreshToken)
    refreshTokens,
  }) : _getAccessToken = getAccessToken,
       _getRefreshToken = getRefreshToken,
       _onTokensRefreshed = onTokensRefreshed,
       _onUnauthorized = onUnauthorized,
       _refreshTokens = refreshTokens;

  final Future<String?> Function() _getAccessToken;
  final Future<String?> Function() _getRefreshToken;
  final Future<void> Function(String access, String refresh) _onTokensRefreshed;
  final Future<void> Function() _onUnauthorized;
  final Future<Map<String, String>?> Function(String refreshToken)
  _refreshTokens;

  bool _refreshing = false;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401 ||
        err.requestOptions.path.contains('/api/v1/auth/')) {
      return handler.next(err);
    }

    if (_refreshing) {
      return handler.next(err);
    }

    _refreshing = true;
    try {
      final refresh = await _getRefreshToken();
      if (refresh == null || refresh.isEmpty) {
        await _onUnauthorized();
        return handler.next(err);
      }

      final refreshed = await _refreshTokens(refresh);
      if (refreshed == null) {
        await _onUnauthorized();
        return handler.next(err);
      }

      final newAccess = refreshed['access_token'] ?? '';
      final newRefresh = refreshed['refresh_token'] ?? '';
      if (newAccess.isEmpty || newRefresh.isEmpty) {
        await _onUnauthorized();
        return handler.next(err);
      }

      await _onTokensRefreshed(newAccess, newRefresh);

      final options = err.requestOptions;
      final retryDio = Dio(BaseOptions(baseUrl: options.baseUrl));
      final response = await retryDio.request<dynamic>(
        options.path,
        data: options.data,
        queryParameters: options.queryParameters,
        options: Options(
          method: options.method,
          headers: {...options.headers, 'authorization': 'Bearer $newAccess'},
        ),
      );

      return handler.resolve(response);
    } catch (_) {
      await _onUnauthorized();
      return handler.next(err);
    } finally {
      _refreshing = false;
    }
  }
}
