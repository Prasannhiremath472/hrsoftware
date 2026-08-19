import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../core/api_client.dart';
import '../models/document.dart';
import '../models/paginated_result.dart';

class DocumentService {
  final ApiClient _client = ApiClient.instance;

  /// Full active list — used by the checklist/upload wizard steps.
  Future<List<DocumentType>> listActiveTypes() async {
    try {
      final response = await _client.dio.get('/document-types', queryParameters: {'activeOnly': 'true'});
      final data = response.data['data'] as List;
      return data.map((e) => DocumentType.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<PaginatedResult<DocumentType>> listTypesPaginated({int page = 1, int limit = 20}) async {
    try {
      final response = await _client.dio.get('/document-types', queryParameters: {'page': page, 'limit': limit});
      return PaginatedResult.fromJson(
        response.data['data'] as Map<String, dynamic>,
        (json) => DocumentType.fromJson(json),
      );
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<DocumentType> createType(DocumentTypePayload payload) async {
    try {
      final response = await _client.dio.post('/document-types', data: payload.toJson());
      return DocumentType.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<DocumentType> updateType(int id, {bool? isMandatory, bool? isActive}) async {
    try {
      final response = await _client.dio.patch('/document-types/$id', data: {
        if (isMandatory != null) 'isMandatory': isMandatory,
        if (isActive != null) 'isActive': isActive,
      });
      return DocumentType.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<List<CandidateDocument>> listForCandidate(int candidateId) async {
    try {
      final response = await _client.dio.get('/candidates/$candidateId/documents');
      final data = response.data['data'] as List;
      return data.map((e) => CandidateDocument.fromJson(e as Map<String, dynamic>)).toList();
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<CandidateDocument> upload({
    required int candidateId,
    required int documentTypeId,
    required Uint8List bytes,
    required String filename,
    void Function(int sent, int total)? onProgress,
  }) async {
    try {
      final formData = FormData.fromMap({
        'documentTypeId': documentTypeId,
        'file': MultipartFile.fromBytes(bytes, filename: filename),
      });
      final response = await _client.dio.post(
        '/candidates/$candidateId/documents',
        data: formData,
        onSendProgress: onProgress,
      );
      return CandidateDocument.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<CandidateDocument> verify(int documentId) async {
    try {
      final response = await _client.dio.patch('/documents/$documentId/verify');
      return CandidateDocument.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  Future<CandidateDocument> reject(int documentId, {required String reason, String? comment}) async {
    try {
      final response = await _client.dio.patch('/documents/$documentId/reject', data: {
        'reason': reason,
        if (comment != null && comment.isNotEmpty) 'comment': comment,
      });
      return CandidateDocument.fromJson(response.data['data'] as Map<String, dynamic>);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  /// Downloads document bytes via the authenticated client (in-memory), for
  /// preview or "open externally" flows.
  Future<Uint8List> fetchBytes(int documentId) async {
    try {
      final response = await _client.dio.get<List<int>>(
        '/documents/$documentId/view',
        options: Options(responseType: ResponseType.bytes),
      );
      return Uint8List.fromList(response.data ?? []);
    } catch (e) {
      throw _client.toApiException(e);
    }
  }

  /// Builds a token-in-query URL for widgets that cannot set headers
  /// (falls back to the auth.js query-param path). Token must already be
  /// URL-safe (JWTs are).
  String viewUrl(int documentId, String? token) {
    final base = '${_client.baseUrl}/documents/$documentId/view';
    if (token == null) return base;
    return '$base?token=$token';
  }
}
