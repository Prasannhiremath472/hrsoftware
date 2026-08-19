import '../core/json_parsing.dart';

/// Paginated list envelope used by /candidates, /coordinators, /audit-logs,
/// /document-types, and the /reports/* endpoints.
class PaginatedResult<T> {
  final List<T> rows;
  final int total;
  final int page;
  final int limit;

  PaginatedResult({
    required this.rows,
    required this.total,
    required this.page,
    required this.limit,
  });

  factory PaginatedResult.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    final rawRows = json['rows'] as List? ?? [];
    return PaginatedResult<T>(
      rows: rawRows.map((e) => fromJsonT(e as Map<String, dynamic>)).toList(),
      total: asInt(json['total']),
      page: json['page'] == null ? 1 : asInt(json['page'], 1),
      limit: json['limit'] == null ? rawRows.length : asInt(json['limit'], rawRows.length),
    );
  }

  int get totalPages => limit == 0 ? 1 : ((total + limit - 1) / limit).ceil().clamp(1, 1 << 30);
  bool get hasMore => page < totalPages;
}
