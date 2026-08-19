import '../core/api_client.dart';
import '../models/coordinator.dart';
import '../models/paginated_result.dart';

class CoordinatorService {
  final ApiClient _client = ApiClient.instance;

  /// Full unpaginated list — used by dropdowns/pickers. Only ACTIVE
  /// coordinators should be offered for assignment by the caller.
  Future<List<Coordinator>> listAll() async {
    try {
      final response = await _client.dio.get('/coordinators');
      final data = response.data['data'] as List;
      return data.map((e) => Coordinator.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<PaginatedResult<Coordinator>> list({
    int page = 1,
    int limit = 20,
    String? status,
    String? search,
  }) async {
    try {
      final response = await _client.dio.get('/coordinators', queryParameters: {
        'page': page,
        'limit': limit,
        if (status != null && status.isNotEmpty) 'status': status,
        if (search != null && search.isNotEmpty) 'search': search,
      });
      return PaginatedResult.fromJson(
        response.data['data'] as Map<String, dynamic>,
        (json) => Coordinator.fromJson(json),
      );
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<Coordinator> getOne(int id) async {
    try {
      final response = await _client.dio.get('/coordinators/$id');
      return Coordinator.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<Coordinator> create(CoordinatorPayload payload) async {
    try {
      final response = await _client.dio.post('/coordinators', data: payload.toJson());
      return Coordinator.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<Coordinator> update(int id, CoordinatorPayload payload) async {
    try {
      final response = await _client.dio.patch('/coordinators/$id', data: payload.toJson());
      return Coordinator.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<Coordinator> updateStatus(int id, CoordinatorStatus status) async {
    try {
      final response = await _client.dio.patch('/coordinators/$id/status', data: {
        'status': coordinatorStatusToString(status),
      });
      return Coordinator.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
