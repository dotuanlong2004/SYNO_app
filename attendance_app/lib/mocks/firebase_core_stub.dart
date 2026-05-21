// Mock Firebase Core cho Windows Desktop
// Firebase không hỗ trợ Windows, nên tạo stub để build được

class FirebaseApp {
  String get name => 'mock_app';
}

class FirebaseOptions {
  FirebaseOptions({
    required this.apiKey,
    required this.appId,
    required this.messagingSenderId,
    required this.projectId,
  });

  final String apiKey;
  final String appId;
  final String messagingSenderId;
  final String projectId;
}

class Firebase {
  static FirebaseApp? _app;

  static Future<FirebaseApp> initializeApp({
    String? name,
    FirebaseOptions? options,
  }) async {
    _app = FirebaseApp();
    return _app!;
  }

  static FirebaseApp? get app => _app;
}
