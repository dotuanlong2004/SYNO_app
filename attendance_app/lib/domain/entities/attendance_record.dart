class AttendanceRecord {
  const AttendanceRecord({
    required this.studentId,
    required this.timestamp,
    required this.status,
    required this.logType,
    this.lateMinutes,
  });

  final String studentId;
  final DateTime timestamp;
  final AttendanceStatus status;
  final AttendanceLogType logType;
  final int? lateMinutes;
}

enum AttendanceStatus { onTime, late, leave }

/// Maps to backend log_type: 'check_in' | 'check_out'
enum AttendanceLogType { checkIn, checkOut }
