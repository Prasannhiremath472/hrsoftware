import '../core/json_parsing.dart';

class DocumentType {
  final int id;
  final String name;
  final String code;
  final bool isMandatory;
  final bool isActive;
  final int displayOrder;

  DocumentType({
    required this.id,
    required this.name,
    required this.code,
    required this.isMandatory,
    required this.isActive,
    required this.displayOrder,
  });

  factory DocumentType.fromJson(Map<String, dynamic> json) {
    return DocumentType(
      id: asInt(json['id']),
      name: json['name'] as String,
      code: json['code'] as String,
      isMandatory: _asBool01(json['is_mandatory']),
      isActive: _asBool01(json['is_active']),
      displayOrder: asInt(json['display_order']),
    );
  }
}

bool _asBool01(Object? v) {
  if (v is bool) return v;
  if (v is int) return v == 1;
  return false;
}

class DocumentTypePayload {
  final String name;
  final String code;
  final bool isMandatory;
  final int displayOrder;

  DocumentTypePayload({
    required this.name,
    required this.code,
    required this.isMandatory,
    required this.displayOrder,
  });

  Map<String, dynamic> toJson() => {
        'name': name,
        'code': code,
        'isMandatory': isMandatory,
        'displayOrder': displayOrder,
      };
}

enum DocumentStatus { uploaded, verified, rejected }

DocumentStatus documentStatusFromString(String value) {
  switch (value) {
    case 'VERIFIED':
      return DocumentStatus.verified;
    case 'REJECTED':
      return DocumentStatus.rejected;
    case 'UPLOADED':
    default:
      return DocumentStatus.uploaded;
  }
}

String documentStatusLabel(DocumentStatus s) {
  switch (s) {
    case DocumentStatus.uploaded:
      return 'Pending Review';
    case DocumentStatus.verified:
      return 'Verified';
    case DocumentStatus.rejected:
      return 'Rejected';
  }
}

class CandidateDocument {
  final int id;
  final int candidateId;
  final int documentTypeId;
  final String documentTypeName;
  final bool documentTypeMandatory;
  final String originalFilename;
  final String mimeType;
  final int fileSizeBytes;
  final DocumentStatus status;
  final String? rejectReason;
  final String? rejectComment;
  final String? verifiedAt;
  final String createdAt;

  CandidateDocument({
    required this.id,
    required this.candidateId,
    required this.documentTypeId,
    required this.documentTypeName,
    required this.documentTypeMandatory,
    required this.originalFilename,
    required this.mimeType,
    required this.fileSizeBytes,
    required this.status,
    this.rejectReason,
    this.rejectComment,
    this.verifiedAt,
    required this.createdAt,
  });

  factory CandidateDocument.fromJson(Map<String, dynamic> json) {
    return CandidateDocument(
      id: asInt(json['id']),
      candidateId: asInt(json['candidate_id']),
      documentTypeId: asInt(json['document_type_id']),
      documentTypeName: json['document_type_name'] as String? ?? '',
      documentTypeMandatory: _asBool01(json['is_mandatory']),
      originalFilename: json['original_filename'] as String? ?? '',
      mimeType: json['mime_type'] as String? ?? '',
      fileSizeBytes: asInt(json['file_size_bytes']),
      status: documentStatusFromString(json['status'] as String? ?? 'UPLOADED'),
      rejectReason: json['reject_reason'] as String?,
      rejectComment: json['reject_comment'] as String?,
      verifiedAt: json['verified_at'] as String?,
      createdAt: json['created_at']?.toString() ?? '',
    );
  }

  bool get isImage => mimeType.startsWith('image/');
  bool get isPdf => mimeType == 'application/pdf';
}
