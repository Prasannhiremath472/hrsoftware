import '../core/api_client.dart';
import '../models/paginated_result.dart';
import '../models/reports.dart';

class ReportService {
  final ApiClient _client = ApiClient.instance;

  Future<PaginatedResult<ReportRow>> fetch(
    ReportKey key, {
    int page = 1,
    int limit = 20,
    String? dateFrom,
    String? dateTo,
  }) async {
    try {
      final response = await _client.dio.get('/reports/${reportKeyToPath(key)}', queryParameters: {
        'page': page,
        'limit': limit,
        if (dateFrom != null && dateFrom.isNotEmpty) 'dateFrom': dateFrom,
        if (dateTo != null && dateTo.isNotEmpty) 'dateTo': dateTo,
      });
      final data = response.data['data'];
      // Some report shapes (e.g. status) may return a bare array rather
      // than a paginated envelope — normalize defensively.
      if (data is List) {
        return PaginatedResult<ReportRow>(
          rows: data.cast<Map<String, dynamic>>(),
          total: data.length,
          page: 1,
          limit: data.length,
        );
      }
      return PaginatedResult.fromJson(
        data as Map<String, dynamic>,
        (json) => json,
      );
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<List<MonthlyRegistrationRow>> monthlyRegistrations() async {
    try {
      final response = await _client.dio.get('/reports/monthly-registrations');
      final data = response.data['data'] as List;
      return data.map((e) => MonthlyRegistrationRow.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
