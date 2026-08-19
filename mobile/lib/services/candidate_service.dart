import '../core/api_client.dart';
import '../models/candidate.dart';
import '../models/paginated_result.dart';

class CandidateService {
  final ApiClient _client = ApiClient.instance;

  Future<Candidate> create(CandidateRegistrationPayload payload) async {
    try {
      final response = await _client.dio.post('/candidates', data: payload.toJson());
      return Candidate.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<PaginatedResult<Candidate>> list({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
    int? coordinatorId,
    String? dateFrom,
    String? dateTo,
  }) async {
    try {
      final response = await _client.dio.get('/candidates', queryParameters: {
        'page': page,
        'limit': limit,
        if (search != null && search.isNotEmpty) 'search': search,
        if (status != null && status.isNotEmpty) 'status': status,
        if (coordinatorId != null) 'coordinatorId': coordinatorId,
        if (dateFrom != null && dateFrom.isNotEmpty) 'dateFrom': dateFrom,
        if (dateTo != null && dateTo.isNotEmpty) 'dateTo': dateTo,
      });
      return PaginatedResult.fromJson(
        response.data['data'] as Map<String, dynamic>,
        (json) => Candidate.fromJson(json),
      );
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<Candidate> getOne(int id) async {
    try {
      final response = await _client.dio.get('/candidates/$id');
      return Candidate.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<Candidate> update(int id, Map<String, dynamic> fields) async {
    try {
      final response = await _client.dio.patch('/candidates/$id', data: fields);
      return Candidate.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<Candidate> assignCoordinator(int id, int coordinatorId) async {
    try {
      final response = await _client.dio.patch('/candidates/$id/coordinator', data: {
        'coordinatorId': coordinatorId,
      });
      return Candidate.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  /// Returns the completed Candidate on success. Throws [ApiException] with
  /// `isValidation == true` and `fieldErrors` populated on a 422 (incomplete
  /// application) — surface those messages directly to the user.
  Future<Candidate> submit(int id) async {
    try {
      final response = await _client.dio.post('/candidates/$id/submit');
      return Candidate.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<List<StatusHistoryEntry>> statusHistory(int id) async {
    try {
      final response = await _client.dio.get('/candidates/$id/status-history');
      final data = response.data['data'] as List;
      return data.map((e) => StatusHistoryEntry.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
