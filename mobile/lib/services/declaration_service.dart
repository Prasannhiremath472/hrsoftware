import '../core/api_client.dart';
import '../models/misc.dart';

class DeclarationService {
  final ApiClient _client = ApiClient.instance;

  Future<Declaration> put(int candidateId, bool accepted) async {
    try {
      final response = await _client.dio.put('/candidates/$candidateId/declaration', data: {
        'accepted': accepted,
      });
      return Declaration.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
