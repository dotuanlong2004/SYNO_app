import 'package:dio/dio.dart';

import '../../core/network/api_config.dart';
import '../../domain/entities/announcement_item.dart';
import '../../domain/entities/chat_message.dart';
import '../../domain/entities/contact_info.dart';
import '../../domain/entities/event_comment.dart';
import '../../domain/entities/grade_record.dart';
import '../../domain/entities/school_event_item.dart';
import '../../domain/entities/school_info.dart';

class ParentFeaturesRemoteDataSource {
  ParentFeaturesRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  int _parseInt(dynamic value) => int.tryParse('${value ?? ''}') ?? 0;

  List<String> _parseStringList(dynamic value) {
    if (value is List) {
      return value
          .map((item) => item.toString().trim())
          .where((item) => item.isNotEmpty)
          .toList();
    }
    return const <String>[];
  }

  String _backendAssetUrl(dynamic value) {
    final raw = '${value ?? ''}'.trim();
    if (raw.isEmpty) return '';

    final base = Uri.parse(ApiConfig.baseUrl);
    final cleanedRaw = raw.replaceFirst('/api/v1/uploads/', '/uploads/');
    final uri = Uri.tryParse(cleanedRaw);
    if (uri == null) return raw;

    Uri fromCurrentApiOrigin(String path, [String? query]) {
      return Uri.parse(base.origin).replace(
        path: path,
        query: query == null || query.isEmpty ? null : query,
      );
    }

    if (!uri.hasScheme) {
      return fromCurrentApiOrigin(uri.path, uri.query).toString();
    }

    final cleanedPath = uri.path.replaceFirst('/api/v1/uploads/', '/uploads/');

    if ((uri.host == '127.0.0.1' || uri.host == 'localhost') &&
        base.host != uri.host) {
      return fromCurrentApiOrigin(cleanedPath, uri.query).toString();
    }

    if (cleanedPath != uri.path) {
      return uri.replace(path: cleanedPath).toString();
    }

    return cleanedRaw;
  }

  ChatMessage _parseChatMessage(Map<String, dynamic> json) {
    return ChatMessage(
      id: _parseInt(json['id']),
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
          id: _parseInt(json['id']),
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

  Future<SchoolInfo> fetchSchoolInfo() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/mobile/school-info',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final data = response.data?['data'];
      if (data is! Map<String, dynamic>) {
        throw Exception('Phản hồi thông tin nhà trường không hợp lệ');
      }
      return SchoolInfo(
        id: '${data['id'] ?? ''}',
        name: '${data['name'] ?? ''}',
        code: '${data['code'] ?? ''}',
        websiteUrl: '${data['website_url'] ?? ''}',
        address: '${data['address'] ?? ''}',
        phone: '${data['phone'] ?? ''}',
        email: '${data['email'] ?? ''}',
        description: '${data['description'] ?? ''}',
        educationLevels: _parseStringList(data['education_levels']),
      );
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(
        serverMsg ?? 'Không thể tải thông tin nhà trường (${e.type.name})',
      );
    } catch (e) {
      throw Exception('Lỗi khi tải thông tin nhà trường: $e');
    }
  }

  ContactInfo _parseContactInfo(Map<String, dynamic> json) {
    return ContactInfo(
      email: '${json['email'] ?? ''}',
      phone: '${json['phone'] ?? ''}',
      fullName: '${json['full_name'] ?? ''}',
    );
  }

  Future<ContactInfo> fetchContactInfo() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/mobile/contact-info',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final data = response.data?['data'];
      if (data is! Map<String, dynamic>) {
        throw Exception('Phản hồi thông tin liên hệ không hợp lệ');
      }
      return _parseContactInfo(data);
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(
        serverMsg ?? 'Không thể tải thông tin liên hệ (${e.type.name})',
      );
    } catch (e) {
      throw Exception('Lỗi khi tải thông tin liên hệ: $e');
    }
  }

  Future<ContactInfo> updateContactInfo({
    required String email,
    required String phone,
  }) async {
    try {
      final response = await _dio.put<Map<String, dynamic>>(
        '/api/v1/mobile/contact-info',
        data: {'email': email.trim(), 'phone': phone.trim()},
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final data = response.data?['data'];
      if (data is! Map<String, dynamic>) {
        throw Exception('Phản hồi cập nhật liên hệ không hợp lệ');
      }
      return _parseContactInfo(data);
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(
        serverMsg ?? 'Không thể cập nhật thông tin liên hệ (${e.type.name})',
      );
    } catch (e) {
      throw Exception('Lỗi khi cập nhật thông tin liên hệ: $e');
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
          id: _parseInt(json['id']),
          title: '${json['title'] ?? ''}',
          content: '${json['content'] ?? ''}',
          imageUrl: _backendAssetUrl(json['image_url']),
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

  Future<List<EventComment>> fetchEventComments(int eventId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/events/$eventId/comments',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final rows = response.data?['data'];
      if (rows is! List) return const <EventComment>[];
      return rows.whereType<Map<String, dynamic>>().map((json) {
        return EventComment(
          id: _parseInt(json['id']),
          eventId: _parseInt(json['event_id']),
          parentId: '${json['parent_id'] ?? ''}',
          commentText: '${json['comment_text'] ?? ''}',
          createdAt: json['created_at'] == null
              ? null
              : DateTime.tryParse('${json['created_at']}'),
        );
      }).toList();
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể tải bình luận (${e.type.name})');
    } catch (e) {
      throw Exception('Lỗi khi tải bình luận: $e');
    }
  }

  Future<EventComment> sendEventComment(int eventId, String commentText) async {
    final text = commentText.trim();
    if (text.isEmpty) {
      throw Exception('Nội dung bình luận không được để trống');
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/api/v1/events/$eventId/comments',
        data: {'comment_text': text},
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final row = response.data?['data'];
      if (row is! Map<String, dynamic>) {
        throw Exception('Phản hồi gửi bình luận không hợp lệ');
      }
      return EventComment(
        id: _parseInt(row['id']),
        eventId: _parseInt(row['event_id']),
        parentId: '${row['parent_id'] ?? ''}',
        commentText: '${row['comment_text'] ?? ''}',
        createdAt: row['created_at'] == null
            ? null
            : DateTime.tryParse('${row['created_at']}'),
      );
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể gửi bình luận (${e.type.name})');
    } catch (e) {
      throw Exception('Lỗi khi gửi bình luận: $e');
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
          id: _parseInt(json['id']),
          studentCode: '${json['student_code'] ?? ''}',
          subjectName: '${json['subject_name'] ?? ''}',
          midtermScore: parseNum(json['midterm_score']),
          finalScore: parseNum(json['final_score']),
          semester: '${json['semester'] ?? ''}',
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
