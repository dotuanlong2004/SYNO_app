import 'package:dio/dio.dart';

import '../models/fee_notice_model.dart';

class FeesRemoteDataSource {
  FeesRemoteDataSource({required Dio dio}) : _dio = dio;

  final Dio _dio;

  Future<List<FeeNoticeModel>> fetchFeeNotices() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/v1/fees');
    final data = response.data;
    if (data == null) return const <FeeNoticeModel>[];
    final rows = data['data'];
    if (rows is! List) return const <FeeNoticeModel>[];
    return rows
        .whereType<Map<String, dynamic>>()
        .map(FeeNoticeModel.fromJson)
        .toList();
  }
}
