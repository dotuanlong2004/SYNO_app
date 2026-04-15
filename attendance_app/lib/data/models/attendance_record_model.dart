import '../../domain/entities/attendance_record.dart';

class AttendanceRecordModel extends AttendanceRecord {
  const AttendanceRecordModel({
    required super.studentId,
    required super.timestamp,
    required super.status,
    super.lateMinutes,
  });

  factory AttendanceRecordModel.fromJson(Map<String, dynamic> json) {
    final rawStatus = (json['status'] as String?) ?? 'on_time';
    final status = switch (rawStatus) {
      'late' => AttendanceStatus.late,
      'leave' => AttendanceStatus.leave,
      _ => AttendanceStatus.onTime,
    };

    return AttendanceRecordModel(
      studentId: (json['student_id'] as String?) ?? 'UNKNOWN',
      timestamp:
          DateTime.tryParse((json['timestamp'] as String?) ?? '') ??
          DateTime.now(),
      status: status,
      lateMinutes: json['late_minutes'] as int?,
    );
  }
}
