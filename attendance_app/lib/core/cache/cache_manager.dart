import 'dart:convert';
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Request Memoization Cache - Cache API responses trong memory
class RequestCache {
  static final Map<String, _CacheEntry> _cache = {};
  static const Duration _defaultTTL = Duration(minutes: 5);

  /// Cache key từ URL và params
  static String _makeKey(String url, Map<String, dynamic>? params) {
    final paramStr = params != null ? jsonEncode(params) : '';
    return '${url}_$paramStr';
  }

  /// Get từ cache nếu còn valid
  static dynamic get(String url, {Map<String, dynamic>? params}) {
    final key = _makeKey(url, params);
    final entry = _cache[key];
    
    if (entry == null) return null;
    if (DateTime.now().isAfter(entry.expiry)) {
      _cache.remove(key);
      return null;
    }
    
    if (kDebugMode) {
      print('📦 [RequestCache] HIT: $url');
    }
    return entry.data;
  }

  /// Set vào cache với TTL
  static void set(String url, dynamic data, {
    Map<String, dynamic>? params,
    Duration ttl = _defaultTTL,
  }) {
    final key = _makeKey(url, params);
    _cache[key] = _CacheEntry(
      data: data,
      expiry: DateTime.now().add(ttl),
    );
    
    if (kDebugMode) {
      print('📦 [RequestCache] SET: $url (TTL: ${ttl.inSeconds}s)');
    }
  }

  /// Invalidate cache cho URL cụ thể
  static void invalidate(String url, {Map<String, dynamic>? params}) {
    final key = _makeKey(url, params);
    _cache.remove(key);
    if (kDebugMode) print('📦 [RequestCache] INVALIDATE: $url');
  }

  /// Invalidate all cache
  static void invalidateAll() {
    _cache.clear();
    if (kDebugMode) print('📦 [RequestCache] INVALIDATE ALL');
  }
}

class _CacheEntry {
  final dynamic data;
  final DateTime expiry;

  _CacheEntry({required this.data, required this.expiry});
}

/// Persistent Data Cache - Lưu data vào disk với FlutterSecureStorage
class DataCache {
  static const _storage = FlutterSecureStorage();

  /// Lưu data với key
  static Future<void> set(String key, dynamic data, {Duration? ttl}) async {
    final entry = _PersistentCacheEntry(
      data: data,
      savedAt: DateTime.now().millisecondsSinceEpoch,
      ttlSeconds: ttl?.inSeconds,
    );
    await _storage.write(key: 'cache_$key', value: jsonEncode(entry.toJson()));
    if (kDebugMode) print('💾 [DataCache] SAVE: $key');
  }

  /// Đọc data từ cache
  static Future<dynamic> get(String key) async {
    try {
      final value = await _storage.read(key: 'cache_$key');
      if (value == null) return null;

      final json = jsonDecode(value) as Map<String, dynamic>;
      final entry = _PersistentCacheEntry.fromJson(json);

      // Check TTL
      if (entry.ttlSeconds != null) {
        final age = DateTime.now().millisecondsSinceEpoch - entry.savedAt;
        if (age > entry.ttlSeconds! * 1000) {
          await _storage.delete(key: 'cache_$key');
          if (kDebugMode) print('💾 [DataCache] EXPIRED: $key');
          return null;
        }
      }

      if (kDebugMode) print('💾 [DataCache] HIT: $key');
      return entry.data;
    } catch (e) {
      return null;
    }
  }

  /// Xóa cache
  static Future<void> delete(String key) async {
    await _storage.delete(key: 'cache_$key');
  }

  /// Xóa tất cả cache
  static Future<void> clear() async {
    final allKeys = await _storage.readAll();
    for (final key in allKeys.keys) {
      if (key.startsWith('cache_')) {
        await _storage.delete(key: key);
      }
    }
  }
}

class _PersistentCacheEntry {
  final dynamic data;
  final int savedAt;
  final int? ttlSeconds;

  _PersistentCacheEntry({
    required this.data,
    required this.savedAt,
    this.ttlSeconds,
  });

  Map<String, dynamic> toJson() => {
    'data': data,
    'savedAt': savedAt,
    'ttlSeconds': ttlSeconds,
  };

  factory _PersistentCacheEntry.fromJson(Map<String, dynamic> json) {
    return _PersistentCacheEntry(
      data: json['data'],
      savedAt: json['savedAt'] as int,
      ttlSeconds: json['ttlSeconds'] as int?,
    );
  }
}

/// Router Cache - Cache page state để back nhanh
class RouterCache {
  static final Map<String, dynamic> _pageState = {};
  static final Map<String, int> _scrollPositions = {};

  /// Lưu page state
  static void saveState(String route, dynamic state) {
    _pageState[route] = state;
  }

  /// Get page state
  static dynamic getState(String route) {
    return _pageState[route];
  }

  /// Lưu scroll position
  static void saveScrollPosition(String route, int position) {
    _scrollPositions[route] = position;
  }

  /// Get scroll position
  static int getScrollPosition(String route) {
    return _scrollPositions[route] ?? 0;
  }

  /// Clear route cache
  static void invalidate(String route) {
    _pageState.remove(route);
    _scrollPositions.remove(route);
  }
}

/// Cache decorator cho functions
class MemoizedCache {
  static final Map<String, Completer<dynamic>> _pendingRequests = {};

  /// Memoize một async function - đảm bảo chỉ gọi 1 request đồng thời
  static Future<T> memoize<T>(
    String key,
    Future<T> Function() fetcher, {
    Duration ttl = const Duration(minutes: 2),
  }) async {
    // Check memory cache
    final cached = RequestCache.get(key);
    if (cached != null) return cached as T;

    // Check pending request (deduplication)
    if (_pendingRequests.containsKey(key)) {
      if (kDebugMode) print('⏳ [Memoized] DEDUPE: $key');
      return await _pendingRequests[key]!.future as T;
    }

    // Create new request
    final completer = Completer<T>();
    _pendingRequests[key] = completer;

    try {
      final result = await fetcher();
      RequestCache.set(key, result, ttl: ttl);
      completer.complete(result);
      return result;
    } catch (e) {
      completer.completeError(e);
      rethrow;
    } finally {
      _pendingRequests.remove(key);
    }
  }
}

/// Extension cho easy caching
extension CacheExtensions on Future<dynamic> {
  /// Cache kết quả với key cụ thể
  Future<T> cacheAs<T>(String key, {Duration ttl = const Duration(minutes: 5)}) {
    return then((value) {
      RequestCache.set(key, value, ttl: ttl);
      return value as T;
    });
  }
}
