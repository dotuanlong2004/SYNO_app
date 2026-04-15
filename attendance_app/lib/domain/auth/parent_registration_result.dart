import 'login_result.dart';

class ParentRegistrationResult {
  const ParentRegistrationResult({
    required this.loginResult,
    required this.studentName,
  });

  final LoginResult loginResult;
  final String studentName;
}
