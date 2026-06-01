import '../../domain/entities/fee_notice.dart';

class FeeNoticeModel extends FeeNotice {
  const FeeNoticeModel({
    required super.id,
    required super.studentCode,
    required super.classId,
    required super.subjectFees,
    required super.otherFees,
    required super.totalAmount,
    required super.paymentStatus,
    required super.paymentMethod,
    required super.paidAt,
  });

  factory FeeNoticeModel.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic value) {
      if (value is num) return value.toDouble();
      return double.tryParse('$value') ?? 0;
    }

    int parseInt(dynamic value) => int.tryParse('${value ?? ''}') ?? 0;

    Map<String, dynamic> parseMap(dynamic value) {
      if (value is Map<String, dynamic>) return value;
      if (value is Map) {
        return value.map((key, val) => MapEntry('$key', val));
      }
      return const <String, dynamic>{};
    }

    return FeeNoticeModel(
      id: parseInt(json['id']),
      studentCode: '${json['student_code'] ?? ''}',
      classId: json['class_id'] == null ? null : '${json['class_id']}',
      subjectFees: parseMap(json['subject_fees']),
      otherFees: parseMap(json['other_fees']),
      totalAmount: parseDouble(json['total_amount']),
      paymentStatus: '${json['payment_status'] ?? 'unpaid'}',
      paymentMethod: json['payment_method'] == null
          ? null
          : '${json['payment_method']}',
      paidAt: json['paid_at'] == null
          ? null
          : DateTime.tryParse('${json['paid_at']}'),
    );
  }
}
