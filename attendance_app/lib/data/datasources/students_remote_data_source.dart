import 'package:dio/dio.dart';

import '../../domain/entities/provision_parent_result.dart';
import '../models/student_link_info_model.dart';

class StudentsRemoteDataSource {
  StudentsRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<StudentLinkInfoModel>> fetchStudents() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/api/v1/students');
      final data = response.data;
      if (data == null) {
        return const <StudentLinkInfoModel>[];
      }

      final rows = data['data'];
      if (rows is! List) {
        return const <StudentLinkInfoModel>[];
      }

      return rows
          .whereType<Map<String, dynamic>>()
          .map(StudentLinkInfoModel.fromJson)
          .toList();
    } on DioException {
      return const <StudentLinkInfoModel>[];
    }
  }

  Future<ProvisionParentResult> provisionParent({
    required int studentId,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/v1/admin/provision-parent',
      data: {'student_id': studentId},
    );

    final data = response.data ?? <String, dynamic>{};
    final student =
        (data['student'] as Map?)?.cast<String, dynamic>() ??
        <String, dynamic>{};
    final credentials =
        (data['credentials'] as Map?)?.cast<String, dynamic>() ??
        <String, dynamic>{};

    return ProvisionParentResult(
      studentName: '${student['full_name'] ?? ''}',
      emailOrPhone: '${credentials['email_or_phone'] ?? ''}',
      password: '${credentials['password'] ?? ''}',
    );
  }
}
