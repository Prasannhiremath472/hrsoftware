/// Uniform exception type surfaced to the UI layer for any API failure.
/// Mirrors the backend's `{ success, message, errors }` envelope.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final List<String>? fieldErrors;

  ApiException({required this.message, this.statusCode, this.fieldErrors});

  bool get isUnauthorized => statusCode == 401;
  bool get isValidation => statusCode == 422;

  @override
  String toString() => message;
}
