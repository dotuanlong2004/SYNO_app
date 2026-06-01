import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // TODO: Implement user-friendly error handling, e.g., show a toast or dialog
    // For now, just rethrow the error after logging or specific handling
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout) {
      // Example: show a message to the user about network issues
      debugPrint('Network error: ${err.message}');
    } else if (err.type == DioExceptionType.badResponse) {
      // Example: handle specific HTTP status codes
      debugPrint('Server error: ${err.response?.statusCode} - ${err.response?.statusMessage}');
    }
    super.onError(err, handler);
  }
}