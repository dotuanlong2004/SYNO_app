import 'package:dio/dio.dart';

import '../models/fee_notice_model.dart';

class FeePaymentQrInfo {
  const FeePaymentQrInfo({
    required this.configured,
    required this.amount,
    required this.addInfo,
    this.qrUrl,
    this.accountNo,
    this.accountName,
    this.message,
    this.note,
  });

  final bool configured;
  final double amount;
  final String addInfo;
  final String? qrUrl;
  final String? accountNo;
  final String? accountName;
  final String? message;
  final String? note;

  factory FeePaymentQrInfo.fromJson(Map<String, dynamic> json) {
    double parseAmount(dynamic value) {
      if (value is num) return value.toDouble();
      return double.tryParse('$value') ?? 0;
    }

    return FeePaymentQrInfo(
      configured: json['configured'] == true,
      amount: parseAmount(json['amount']),
      addInfo: '${json['add_info'] ?? ''}',
      qrUrl: json['qr_url'] == null ? null : '${json['qr_url']}',
      accountNo: json['account_no'] == null ? null : '${json['account_no']}',
      accountName: json['account_name'] == null
          ? null
          : '${json['account_name']}',
      message: json['message'] == null ? null : '${json['message']}',
      note: json['note'] == null ? null : '${json['note']}',
    );
  }
}

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

  Future<FeePaymentQrInfo> fetchPaymentQr(int feeId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/api/v1/fees/$feeId/payment-qr',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );
      final data =
          (response.data?['data'] as Map?)?.cast<String, dynamic>() ??
          <String, dynamic>{};
      return FeePaymentQrInfo.fromJson(data);
    } on DioException catch (e) {
      final serverMsg = e.response?.data?['error']?.toString();
      throw Exception(serverMsg ?? 'Không thể tạo mã QR thanh toán');
    } catch (e) {
      throw Exception('Lỗi khi tạo mã QR thanh toán: $e');
    }
  }
}
