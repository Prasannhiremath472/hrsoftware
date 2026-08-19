import '../core/api_client.dart';
import '../models/biometric.dart';

class BiometricService {
  final ApiClient _client = ApiClient.instance;

  Future<BiometricDeviceStatus> deviceStatus() async {
    try {
      final response = await _client.dio.get('/biometric/device-status');
      return BiometricDeviceStatus.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<BiometricRecord> capture(int candidateId, BiometricHand hand) async {
    try {
      final response = await _client.dio.post('/candidates/$candidateId/biometric/capture', data: {
        'hand': biometricHandToString(hand),
      });
      return BiometricRecord.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<List<BiometricRecord>> listForCandidate(int candidateId) async {
    try {
      final response = await _client.dio.get('/candidates/$candidateId/biometric');
      final data = response.data['data'] as List;
      return data.map((e) => BiometricRecord.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<BiometricVerifyResult> verify(int candidateId, BiometricHand hand) async {
    try {
      final response = await _client.dio.post('/candidates/$candidateId/biometric/verify', data: {
        'hand': biometricHandToString(hand),
      });
      return BiometricVerifyResult.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
