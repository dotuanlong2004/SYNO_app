import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../domain/auth/auth_user.dart';
import '../../domain/auth/token_pair.dart';

class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const String _accessKey    = 'auth_access_token';
  static const String _refreshKey   = 'auth_refresh_token';
  static const String _userIdKey     = 'auth_user_id';
  static const String _userEmailKey  = 'auth_user_email';
  static const String _userNameKey   = 'auth_user_full_name';
  static const String _userRoleKey   = 'auth_user_role';

  Future<void> save(TokenPair tokens) async {
    await _storage.write(key: _accessKey,  value: tokens.accessToken);
    await _storage.write(key: _refreshKey, value: tokens.refreshToken);
  }

  Future<void> saveUser(AuthUser user) async {
    await _storage.write(key: _userIdKey,    value: user.id);
    await _storage.write(key: _userEmailKey, value: user.email);
    await _storage.write(key: _userNameKey,  value: user.fullName);
    await _storage.write(key: _userRoleKey,  value: user.role);
  }

  Future<TokenPair?> read() async {
    final access  = await _storage.read(key: _accessKey);
    final refresh = await _storage.read(key: _refreshKey);
    if (access == null || refresh == null || access.isEmpty || refresh.isEmpty) {
      return null;
    }
    return TokenPair(accessToken: access, refreshToken: refresh);
  }

  Future<AuthUser?> readUser() async {
    final id    = await _storage.read(key: _userIdKey);
    final email = await _storage.read(key: _userEmailKey);
    final name  = await _storage.read(key: _userNameKey);
    final role  = await _storage.read(key: _userRoleKey);
    if (id == null || id.isEmpty) return null;
    return AuthUser(
      id:       id,
      email:    email ?? '',
      fullName: name  ?? '',
      role:     role  ?? 'parent',
    );
  }

  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
    await _storage.delete(key: _userIdKey);
    await _storage.delete(key: _userEmailKey);
    await _storage.delete(key: _userNameKey);
    await _storage.delete(key: _userRoleKey);
  }
}
