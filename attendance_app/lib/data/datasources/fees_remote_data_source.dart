import 'package:dio/dio.dart';

import '../models/fee_notice_model.dart';

class FeesRemoteDataSource {
  FeesRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<FeeNoticeModel>> fetchFeeNotices() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/fees',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final data = response.data;
      if (data == null) return const <FeeNoticeModel>[];
      final rows = data['data'];
      if (rows is! List) return const <FeeNoticeModel>[];
      return rows
          .whereType<Map<String, dynamic>>()
          .map(FeeNoticeModel.fromJson)
          .toList();
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể tải học phí (${e.type.name})');
    } catch (e) {
      throw Exception('Lỗi khi tải học phí: $e');
    }
  }
}
