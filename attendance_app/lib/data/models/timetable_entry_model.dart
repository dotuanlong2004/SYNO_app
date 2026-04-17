import '../../domain/entities/timetable_entry.dart';

class TimetableEntryModel extends TimetableEntry {
  const TimetableEntryModel({
    required super.id,
    required super.classId,
    required super.subjectName,
    required super.dayOfWeek,
    required super.period,
    required super.startTime,
    required super.endTime,
    required super.room,
    required super.teacherName,
  });

  factory TimetableEntryModel.fromJson(Map<String, dynamic> json) {
    int parseInt(dynamic value, {required int fallback}) {
      if (value is int) return value;
      if (value is num) return value.toInt();
      final parsed = int.tryParse('$value');
      return parsed ?? fallback;
    }

    String parseString(dynamic value, {required String fallback}) {
      if (value == null) return fallback;
      final text = '$value'.trim();
      return text.isEmpty ? fallback : text;
    }

    return TimetableEntryModel(
      id: parseInt(json['id'], fallback: 0),
      classId: parseString(json['class_id'], fallback: ''),
      subjectName: parseString(
        json['subject_name'],
        fallback: 'Chưa có môn học',
      ),
      dayOfWeek: parseInt(json['day_of_week'], fallback: 1),
      period: parseString(json['period'], fallback: ''),
      startTime: parseString(json['start_time'], fallback: '--:--'),
      endTime: parseString(json['end_time'], fallback: '--:--'),
      room: parseString(json['room'], fallback: 'Chưa có phòng'),
      teacherName: parseString(json['teacher_name'], fallback: ''),
    );
  }
}
