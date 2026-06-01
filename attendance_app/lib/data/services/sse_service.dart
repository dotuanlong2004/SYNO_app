import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';

class SseService {
  final Dio dio;
  StreamSubscription? _subscription;
  final _controller = StreamController<Map<String, dynamic>>.broadcast();

  SseService({required this.dio});

  Stream<Map<String, dynamic>> get events => _controller.stream;

  Future<void> connect(String accessToken) async {
    await disconnect();
    
    try {
      final response = await dio.get<ResponseBody>(
        '/api/v1/sse',
        options: Options(
          headers: {
            'Authorization': 'Bearer $accessToken',
            'Accept': 'text/event-stream',
          },
          responseType: ResponseType.stream,
        ),
      );

      final stream = response.data!.stream;
      _subscription = stream.cast<List<int>>().transform(utf8.decoder).transform(const LineSplitter()).listen(
        (line) {
          if (line.startsWith('data: ')) {
            try {
              final data = jsonDecode(line.substring(6));
              _controller.add(data);
            } catch (e) {
              debugPrint('SSE Error decoding: $e');
            }
          }
        },
         onError: (e) => debugPrint('SSE Error: $e'),
      );
    } catch (e) {
      debugPrint('SSE Connection failed: $e');
    }
  }

  Future<void> disconnect() async {
    await _subscription?.cancel();
    _subscription = null;
  }
}