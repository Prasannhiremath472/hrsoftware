import 'package:dio/dio.dart';

import 'api_exception.dart';
import 'config.dart';
import 'secure_storage.dart';

/// Callback invoked when the API client detects a 401 — the app-level
/// listener (see providers/auth_provider.dart) clears session state and
/// routes to login, mirroring the web app's axios response interceptor.
typedef UnauthorizedHandler = void Function();

/// Shared Dio-based HTTP client. Attaches the Bearer token to every request
/// and centralizes 401 handling so no call site duplicates auth-header
/// logic. The JWT itself is never printed/logged anywhere in this class.
class ApiClient {
  ApiClient._internal() {
    _dio = Dio(
      BaseOptions(
        // Read lazily inside the request/response cycle rather than once at
        // construction time: `ApiClient.instance` is a static final field,
        // so it may otherwise be created (and its baseUrl frozen) by any
        // provider that touches it before main()'s `await dotenv.load()`
        // has actually resolved — silently pinning the app to AppConfig's
        // Android-emulator fallback for its entire lifetime regardless of
        // the real .env value. baseUrl is re-read per request instead.
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 60),
        contentType: 'application/json',
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          options.baseUrl = AppConfig.apiBaseUrl;
          handler.next(options);
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SecureStorageService.instance.readToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            await SecureStorageService.instance.clearToken();
            _unauthorizedHandler?.call();
          }
          handler.next(error);
        },
      ),
    );
  }

  static final ApiClient instance = ApiClient._internal();

  late final Dio _dio;
  UnauthorizedHandler? _unauthorizedHandler;

  Dio get dio => _dio;

  void setUnauthorizedHandler(UnauthorizedHandler handler) {
    _unauthorizedHandler = handler;
  }

  /// Full base URL, e.g. for building auth-token-in-query image URLs.
  String get baseUrl => AppConfig.apiBaseUrl;

  /// Converts any Dio failure into an [ApiException] with the backend's
  /// message/errors surfaced cleanly, or a sensible fallback for network
  /// failures (timeout, no connection, etc).
  ApiException toApiException(Object error) {
    if (error is ApiException) return error;
    if (error is DioException) {
      final response = error.response;
      if (response != null && response.data is Map) {
        final data = response.data as Map;
        final message = (data['message'] as String?) ?? 'Something went wrong';
        List<String>? fieldErrors;
        final rawErrors = data['errors'];
        if (rawErrors is List) {
          fieldErrors = rawErrors
              .map((e) {
                if (e is Map) return (e['message'] ?? e['msg'] ?? '').toString();
                return e.toString();
              })
              .where((s) => s.isNotEmpty)
              .toList();
        }
        return ApiException(
          message: message,
          statusCode: response.statusCode,
          fieldErrors: fieldErrors,
        );
      }
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return ApiException(message: 'The request timed out. Check your connection and try again.');
        case DioExceptionType.connectionError:
          return ApiException(message: 'Could not reach the server. Check your network connection.');
        default:
          return ApiException(message: error.message ?? 'Something went wrong');
      }
    }
    return ApiException(message: error.toString());
  }
}
