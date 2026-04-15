class AttendanceRecord {
  const AttendanceRecord({
    required this.studentId,
    required this.timestamp,
    required this.status,
    this.lateMinutes,
  });

  final String studentId;
  final DateTime timestamp;
  final AttendanceStatus status;
  final int? lateMinutes;
}

enum AttendanceStatus { onTime, late, leave }
