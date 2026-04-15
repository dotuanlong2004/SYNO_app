import '../entities/student_link_info.dart';
import '../entities/provision_parent_result.dart';

abstract class StudentsRepository {
  Future<List<StudentLinkInfo>> fetchStudents();

  Future<ProvisionParentResult> provisionParent({
    required int studentId,
    required String parentName,
    required String parentEmailOrPhone,
  });
}
