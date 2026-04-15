import '../../domain/auth/token_pair.dart';

class TokenSession {
  TokenSession(this._tokens);

  TokenPair? _tokens;

  String? get accessToken => _tokens?.accessToken;

  String? get refreshToken => _tokens?.refreshToken;

  bool get hasSession => _tokens != null;

  Future<void> set(TokenPair tokens) async {
    _tokens = tokens;
  }

  Future<void> clear() async {
    _tokens = null;
  }
}
