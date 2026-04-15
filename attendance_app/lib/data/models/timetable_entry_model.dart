import '../../domain/entities/timetable_entry.dart';

class TimetableEntryModel extends TimetableEntry {
  const TimetableEntryModel({
    required super.id,
    required super.classId,
    required super.subjectName,
    required super.dayOfWeek,
    required super.startTime,
    required super.endTime,
    required super.room,
  });

  factory TimetableEntryModel.fromJson(Map<String, dynamic> json) {
    return TimetableEntryModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      classId: (json['class_id'] as String?) ?? '',
      subjectName: (json['subject_name'] as String?) ?? 'Chưa có môn học',
      dayOfWeek: (json['day_of_week'] as num?)?.toInt() ?? 1,
      startTime: (json['start_time'] as String?) ?? '--:--',
      endTime: (json['end_time'] as String?) ?? '--:--',
      room: (json['room'] as String?) ?? 'Chưa có phòng',
    );
  }
}
