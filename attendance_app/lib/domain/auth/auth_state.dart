import 'auth_user.dart';

class AuthState {
  const AuthState._({required this.status, this.user, this.message});

  final AuthStatus status;
  final AuthUser? user;
  final String? message;

  const AuthState.unknown() : this._(status: AuthStatus.unknown);
  const AuthState.authenticated(AuthUser user)
    : this._(status: AuthStatus.authenticated, user: user);
  const AuthState.unauthenticated([String? message])
    : this._(status: AuthStatus.unauthenticated, message: message);

  bool get isAuthenticated => status == AuthStatus.authenticated;
}

enum AuthStatus { unknown, authenticated, unauthenticated }
