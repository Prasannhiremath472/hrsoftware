import '../core/api_client.dart';
import '../models/settings.dart';

class SettingsService {
  final ApiClient _client = ApiClient.instance;

  Future<AppSettings> get() async {
    try {
      final response = await _client.dio.get('/settings');
      return AppSettings.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<AppSettings> update(Map<String, String> entries) async {
    try {
      final response = await _client.dio.put('/settings', data: entries);
      return AppSettings.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }
}
