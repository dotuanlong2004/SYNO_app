class FeeNotice {
  const FeeNotice({
    required this.id,
    required this.studentCode,
    required this.classId,
    required this.subjectFees,
    required this.otherFees,
    required this.totalAmount,
    required this.paymentStatus,
    required this.paymentMethod,
    required this.paidAt,
  });

  final int id;
  final String studentCode;
  final String? classId;
  final Map<String, dynamic> subjectFees;
  final Map<String, dynamic> otherFees;
  final double totalAmount;
  final String paymentStatus;
  final String? paymentMethod;
  final DateTime? paidAt;
}
