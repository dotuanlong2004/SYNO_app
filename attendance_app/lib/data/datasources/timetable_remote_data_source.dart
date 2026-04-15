import 'package:dio/dio.dart';

import '../models/timetable_entry_model.dart';

class TimetableRemoteDataSource {
  TimetableRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<TimetableEntryModel>> fetchTimetable() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/v1/mobile/timetable',
    );
    final data = response.data;
    if (data == null) {
      return const <TimetableEntryModel>[];
    }

    final recordsRaw = data['data'];
    if (recordsRaw is! List) {
      return const <TimetableEntryModel>[];
    }

    return recordsRaw
        .whereType<Map<String, dynamic>>()
        .map(TimetableEntryModel.fromJson)
        .toList();
  }
}
