import 'auth_user.dart';
import 'token_pair.dart';

class LoginResult {
  const LoginResult({required this.user, required this.tokens});

  final AuthUser user;
  final TokenPair tokens;
}
