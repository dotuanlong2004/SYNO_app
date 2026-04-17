import 'package:dio/dio.dart';

import '../models/attendance_record_model.dart';

class AttendanceRemoteDataSource {
  AttendanceRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<AttendanceRecordModel>> fetchAttendanceHistory() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/attendance',
        queryParameters: const {'limit': 100},
      );

      final data = response.data;
      if (data == null) {
        return const <AttendanceRecordModel>[];
      }

      final recordsRaw = data['data'];
      if (recordsRaw is! List) {
        return const <AttendanceRecordModel>[];
      }

      return recordsRaw
          .whereType<Map<String, dynamic>>()
          .map(AttendanceRecordModel.fromJson)
          .toList();
    } on DioException catch (error) {
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout) {
        // Keep dashboard usable in demo/offline mode.
        return const <AttendanceRecordModel>[];
      }
      rethrow;
    }
  }
}
