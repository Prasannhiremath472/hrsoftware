import '../core/api_client.dart';
import '../models/auth_models.dart';

class AuthService {
  final ApiClient _client = ApiClient.instance;

  Future<PreAuthChallenge> login({required String email, required String password}) async {
    try {
      final response = await _client.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      return PreAuthChallenge.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<VerifiedSession> verifyOtp({required String preAuthToken, required String otp}) async {
    try {
      final response = await _client.dio.post('/auth/verify-otp', data: {
        'preAuthToken': preAuthToken,
        'otp': otp,
      });
      return VerifiedSession.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<PreAuthChallenge> resendOtp({required String preAuthToken}) async {
    try {
      final response = await _client.dio.post('/auth/resend-otp', data: {
        'preAuthToken': preAuthToken,
      });
      return PreAuthChallenge.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<AuthUser> me() async {
    try {
      final response = await _client.dio.get('/auth/me');
      return AuthUser.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<void> logout() async {
    try {
      await _client.dio.post('/auth/logout');
    } catch (e) {
      // Best-effort — local session is cleared regardless by the caller.
    }
  }
}
