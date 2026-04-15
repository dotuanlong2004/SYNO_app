import '../entities/timetable_entry.dart';

abstract class TimetableRepository {
  Future<List<TimetableEntry>> fetchTimetable();
}
