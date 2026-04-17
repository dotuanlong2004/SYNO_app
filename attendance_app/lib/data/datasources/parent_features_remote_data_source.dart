import 'package:dio/dio.dart';

import '../../domain/entities/announcement_item.dart';
import '../../domain/entities/chat_message.dart';
import '../../domain/entities/grade_record.dart';

class ParentFeaturesRemoteDataSource {
  ParentFeaturesRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<AnnouncementItem>> fetchAnnouncements() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/v1/announcements');
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
  }

  Future<List<GradeRecord>> fetchGrades() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/v1/grades');
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
  }

  Future<List<ChatMessage>> fetchChatMessages() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/v1/chat/messages');
    final rows = response.data?['data'];
    if (rows is! List) return const <ChatMessage>[];
    return rows.whereType<Map<String, dynamic>>().map((json) {
      return ChatMessage(
        id: (json['id'] as num?)?.toInt() ?? 0,
        studentCode: '${json['student_code'] ?? ''}',
        senderRole: '${json['sender_role'] ?? ''}',
        senderName: '${json['sender_name'] ?? ''}',
        messageText: '${json['message_text'] ?? ''}',
        createdAt: json['created_at'] == null
            ? null
            : DateTime.tryParse('${json['created_at']}'),
      );
    }).toList();
  }

  Future<void> sendChatMessage({
    required String messageText,
    String? studentCode,
  }) async {
    await _dio.post<Map<String, dynamic>>(
      '/api/v1/chat/messages',
      data: <String, dynamic>{
        if (studentCode != null && studentCode.isNotEmpty) 'student_code': studentCode,
        'message_text': messageText,
      },
    );
  }
}
