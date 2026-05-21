import '../../domain/entities/attendance_record.dart';

class AttendanceRecordModel extends AttendanceRecord {
  const AttendanceRecordModel({
    required super.studentId,
    required super.timestamp,
    required super.status,
    required super.logType,
    super.lateMinutes,
  });

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    final rawStatus = (json['status'] as String?) ?? 'on_time';
    final status = switch (rawStatus) {
      'late' => AttendanceStatus.late,
      'leave' => AttendanceStatus.leave,
      _ => AttendanceStatus.onTime,
    };

    final rawLogType = (json['log_type'] as String?) ?? 'check_in';
    final logType = rawLogType == 'check_out'
        ? AttendanceLogType.checkOut
        : AttendanceLogType.checkIn;

    int? parseNullableInt(dynamic value) {
      if (value == null) return null;
      if (value is int) return value;
      if (value is num) return value.toInt();
      return int.tryParse('$value');
    }

    final parsedTimestamp =
        DateTime.tryParse((json['timestamp'] as String?) ?? '') ??
        DateTime.now();

    return AttendanceRecordModel(
      studentId: (json['student_id'] as String?) ?? 'UNKNOWN',
      timestamp: parsedTimestamp.toLocal(),
      status: status,
      logType: logType,
      lateMinutes: parseNullableInt(json['late_minutes']),
    );
  }
}
