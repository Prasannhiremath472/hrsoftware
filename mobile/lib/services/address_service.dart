import '../core/api_client.dart';
import '../models/address.dart';

class AddressService {
  final ApiClient _client = ApiClient.instance;

  Future<AddressData?> get(int candidateId) async {
    try {
      final response = await _client.dio.get('/candidates/$candidateId/address');
      final data = response.data['data'];
      if (data == null) return null;
      return AddressData.fromJson(data as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<AddressData> put(int candidateId, AddressPayload payload) async {
    try {
      final response = await _client.dio.put('/candidates/$candidateId/address', data: payload.toJson());
      return AddressData.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
