import 'package:dio/dio.dart';

import '../../domain/entities/announcement_item.dart';
import '../../domain/entities/chat_message.dart';
import '../../domain/entities/grade_record.dart';
import '../../domain/entities/school_event_item.dart';

class ParentFeaturesRemoteDataSource {
  ParentFeaturesRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  ChatMessage _parseChatMessage(Map<String, dynamic> json) {
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
  }

  Future<List<ChatMessage>> fetchChatMessages() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/chat/messages',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final rows = response.data?['data'];
      if (rows is! List) return const <ChatMessage>[];
      return rows
          .whereType<Map<String, dynamic>>()
          .map(_parseChatMessage)
          .toList();
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể tải tin nhắn (${e.type.name})');
    } catch (e) {
      throw Exception('Lỗi khi tải tin nhắn: $e');
    }
  }

  Future<ChatMessage> sendChatMessage(String messageText) async {
    final text = messageText.trim();
    if (text.isEmpty) {
      throw Exception('Nội dung tin nhắn không được để trống');
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/chat/messages',
        data: {'message_text': text},
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final row = response.data?['data'];
      if (row is! Map<String, dynamic>) {
        throw Exception('Phản hồi gửi tin nhắn không hợp lệ');
      }
      return _parseChatMessage(row);
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể gửi tin nhắn (${e.type.name})');
    } catch (e) {
      throw Exception('Lỗi khi gửi tin nhắn: $e');
    }
  }

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
          priority: '${json['priority'] ?? 'normal'}',
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

  Future<List<SchoolEventItem>> fetchEvents() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/events',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final rows = response.data?['data'];
      if (rows is! List) return const <SchoolEventItem>[];
      return rows.whereType<Map<String, dynamic>>().map((json) {
        return SchoolEventItem(
          id: (json['id'] as num?)?.toInt() ?? 0,
          title: '${json['title'] ?? ''}',
          content: '${json['content'] ?? ''}',
          imageUrl: '${json['image_url'] ?? ''}',
          eventDate: json['event_date'] == null
              ? null
              : DateTime.tryParse('${json['event_date']}'),
          publishedAt: json['published_at'] == null
              ? null
              : DateTime.tryParse('${json['published_at']}'),
        );
      }).toList();
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể tải sự kiện (${e.type.name})');
    } catch (e) {
      throw Exception('Lỗi khi tải sự kiện: $e');
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
      double parseNum(dynamic v) =>
          v is num ? v.toDouble() : (double.tryParse('$v') ?? 0);
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
