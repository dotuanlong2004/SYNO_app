import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/student_link_info_model.dart';
import 'dashboard_providers.dart';

/// Provider lấy danh sách học sinh đã liên kết với phụ huynh
final linkedStudentsProvider = FutureProvider<List<StudentLinkInfoModel>>((ref) async {
  try {
    final dio = ref.watch(dioProvider);
    final response = await dio.get<Map<String, dynamic>>(
      '/api/v1/mobile/parent/linked-students',
      options: Options(receiveTimeout: const Duration(seconds: 10)),
    );
    final body = response.data;
    if (body == null || body['ok'] != true) return const <StudentLinkInfoModel>[];
    final raw = body['data'];
    if (raw is! List) return const <StudentLinkInfoModel>[];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(StudentLinkInfoModel.fromJson)
        .toList();
  } catch (_) {
    return const <StudentLinkInfoModel>[];
  }
});
