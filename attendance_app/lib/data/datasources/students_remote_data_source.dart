import 'package:dio/dio.dart';

import '../models/student_link_info_model.dart';

class StudentsRemoteDataSource {
  StudentsRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<StudentLinkInfoModel>> fetchStudents() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/v1/mobile/students',
    );
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
  }
}
