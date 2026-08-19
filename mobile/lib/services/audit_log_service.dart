import '../core/api_client.dart';
import '../models/audit_log.dart';
import '../models/paginated_result.dart';

class AuditLogService {
  final ApiClient _client = ApiClient.instance;

  Future<PaginatedResult<AuditLogEntry>> list({
    int page = 1,
    int limit = 20,
    int? userId,
    String? action,
    String? dateFrom,
    String? dateTo,
  }) async {
    try {
      final response = await _client.dio.get('/audit-logs', queryParameters: {
        'page': page,
        'limit': limit,
        if (userId != null) 'userId': userId,
        if (action != null && action.isNotEmpty) 'action': action,
        if (dateFrom != null && dateFrom.isNotEmpty) 'dateFrom': dateFrom,
        if (dateTo != null && dateTo.isNotEmpty) 'dateTo': dateTo,
      });
      return PaginatedResult.fromJson(
        response.data['data'] as Map<String, dynamic>,
        (json) => AuditLogEntry.fromJson(json),
      );
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
