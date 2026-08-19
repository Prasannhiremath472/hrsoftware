import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../core/api_client.dart';
import '../models/misc.dart';

class PhotoService {
  final ApiClient _client = ApiClient.instance;

  Future<PhotoSaveResult> upload({
    required int candidateId,
    required Uint8List bytes,
    required String filename,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: filename),
      });
      final response = await _client.dio.post('/candidates/$candidateId/photo', data: formData);
      return PhotoSaveResult.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<Uint8List?> fetchBytes(int candidateId) async {
    try {
      final response = await _client.dio.get<List<int>>(
        '/candidates/$candidateId/photo',
        options: Options(responseType: ResponseType.bytes),
      );
      return Uint8List.fromList(response.data ?? []);
    } catch (e) {
      final apiEx = _client.toApiException(e);
      if (apiEx.statusCode == 404) return null;
      throw apiEx;
    }
  }

  String viewUrl(int candidateId, String? token) {
    final base = '${_client.baseUrl}/candidates/$candidateId/photo';
    if (token == null) return base;
    return '$base?token=$token';
  }
}
