import '../../domain/entities/student_link_info.dart';
import '../../domain/entities/provision_parent_result.dart';
import '../../domain/repositories/students_repository.dart';
import '../datasources/students_remote_data_source.dart';

class StudentsRepositoryImpl implements StudentsRepository {
  StudentsRepositoryImpl(this._remoteDataSource);

  final StudentsRemoteDataSource _remoteDataSource;

  @override
  Future<List<StudentLinkInfo>> fetchStudents() {
    return _remoteDataSource.fetchStudents();
  }

  @override
  Future<ProvisionParentResult> provisionParent({
    required int studentId,
    required String parentName,
    required String parentEmailOrPhone,
  }) {
    return _remoteDataSource.provisionParent(
      studentId: studentId,
      parentName: parentName,
      parentEmailOrPhone: parentEmailOrPhone,
    );
  }
}
