import '../core/api_client.dart';
import '../models/misc.dart';

class SignatureService {
  final ApiClient _client = ApiClient.instance;

  Future<SignatureSaveResult> save(int candidateId, String signatureBase64PngDataUrl) async {
    try {
      final response = await _client.dio.post('/candidates/$candidateId/signature', data: {
        'signatureBase64': signatureBase64PngDataUrl,
      });
      return SignatureSaveResult.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
