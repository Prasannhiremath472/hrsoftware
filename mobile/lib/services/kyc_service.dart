import '../core/api_client.dart';
import '../models/kyc.dart';

class KycService {
  final ApiClient _client = ApiClient.instance;

  Future<KycData?> get(int candidateId) async {
    try {
      final response = await _client.dio.get('/candidates/$candidateId/kyc');
      final data = response.data['data'];
      if (data == null) return null;
      return KycData.fromJson(data as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<KycData> put(int candidateId, KycPayload payload) async {
    try {
      final response = await _client.dio.put('/candidates/$candidateId/kyc', data: payload.toJson());
      return KycData.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
