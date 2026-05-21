import 'package:dio/dio.dart';

import '../../domain/entities/announcement_item.dart';
import '../../domain/entities/grade_record.dart';

class ParentFeaturesRemoteDataSource {
  ParentFeaturesRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<AnnouncementItem>> fetchAnnouncements() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/announcements',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final rows = response.data?['data'];
      if (rows is! List) return const <AnnouncementItem>[];
      return rows.whereType<Map<String, dynamic>>().map((json) {
        return AnnouncementItem(
          id: (json['id'] as num?)?.toInt() ?? 0,
          title: '${json['title'] ?? ''}',
          content: '${json['content'] ?? ''}',
          publishedAt: json['published_at'] == null
              ? null
              : DateTime.tryParse('${json['published_at']}'),
        );
      }).toList();
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể tải thông báo (${e.type.name})');
    } catch (e) {
      throw Exception('Lỗi khi tải thông báo: $e');
    }
  }

  Future<List<GradeRecord>> fetchGrades() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/grades',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final rows = response.data?['data'];
      if (rows is! List) return const <GradeRecord>[];
      double parseNum(dynamic v) => v is num ? v.toDouble() : (double.tryParse('$v') ?? 0);
      return rows.whereType<Map<String, dynamic>>().map((json) {
        return GradeRecord(
          id: (json['id'] as num?)?.toInt() ?? 0,
          studentCode: '${json['student_code'] ?? ''}',
          subjectName: '${json['subject_name'] ?? ''}',
          midtermScore: parseNum(json['midterm_score']),
          finalScore: parseNum(json['final_score']),
        );
      }).toList();
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể tải bảng điểm (${e.type.name})');
    } catch (e) {
      throw Exception('Lỗi khi tải bảng điểm: $e');
    }
  }
}
