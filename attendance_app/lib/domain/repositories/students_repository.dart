import '../entities/student_link_info.dart';

abstract class StudentsRepository {
  Future<List<StudentLinkInfo>> fetchStudents();
}
