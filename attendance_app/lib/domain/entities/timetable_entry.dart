class TimetableEntry {
  const TimetableEntry({
    required this.id,
    required this.classId,
    required this.subjectName,
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    required this.room,
  });

  final int id;
  final String classId;
  final String subjectName;
  final int dayOfWeek;
  final String startTime;
  final String endTime;
  final String room;
}
