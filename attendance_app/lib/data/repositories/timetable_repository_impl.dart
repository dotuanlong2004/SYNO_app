import '../../domain/entities/timetable_entry.dart';
import '../../domain/repositories/timetable_repository.dart';
import '../datasources/timetable_remote_data_source.dart';

class TimetableRepositoryImpl implements TimetableRepository {
  TimetableRepositoryImpl(this._remoteDataSource);

  final TimetableRemoteDataSource _remoteDataSource;

  @override
  Future<List<TimetableEntry>> fetchTimetable() {
    return _remoteDataSource.fetchTimetable();
  }
}
