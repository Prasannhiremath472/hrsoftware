import '../core/api_client.dart';
import '../models/misc.dart';

class OriginalVerificationService {
  final ApiClient _client = ApiClient.instance;

  Future<OriginalVerification?> get(int candidateId) async {
    try {
      final response = await _client.dio.get('/candidates/$candidateId/original-verification');
      final data = response.data['data'];
      if (data == null) return null;
      return OriginalVerification.fromJson(data as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<OriginalVerification> put(
    int candidateId, {
    required bool originalsVerified,
    required bool selfAttestedReceived,
  }) async {
    try {
      final response = await _client.dio.put('/candidates/$candidateId/original-verification', data: {
        'originalsVerified': originalsVerified,
        'selfAttestedReceived': selfAttestedReceived,
      });
      return OriginalVerification.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
