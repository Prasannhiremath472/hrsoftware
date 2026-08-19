bool _asBool01(Object? v) {
  if (v is bool) return v;
  if (v is int) return v == 1;
  return false;
}

/// GET/PUT /candidates/:id/original-verification
class OriginalVerification {
  final int id;
  final int candidateId;
  final bool originalsVerified;
  final bool selfAttestedReceived;
  final String? verifiedAt;

  OriginalVerification({
    required this.id,
    required this.candidateId,
    required this.originalsVerified,
    required this.selfAttestedReceived,
    this.verifiedAt,
  });

  factory OriginalVerification.fromJson(Map<String, dynamic> json) {
    return OriginalVerification(
      id: json['id'] as int,
      candidateId: json['candidate_id'] as int,
      originalsVerified: _asBool01(json['originals_verified']),
      selfAttestedReceived: _asBool01(json['self_attested_received']),
      verifiedAt: json['verified_at'] as String?,
    );
  }
}

/// PUT /candidates/:id/declaration response.
class Declaration {
  final int id;
  final int candidateId;
  final bool accepted;
  final String? acceptedAt;

  Declaration({required this.id, required this.candidateId, required this.accepted, this.acceptedAt});

  factory Declaration.fromJson(Map<String, dynamic> json) {
    return Declaration(
      id: json['id'] as int,
      candidateId: json['candidate_id'] as int,
      accepted: _asBool01(json['accepted']),
      acceptedAt: json['accepted_at'] as String?,
    );
  }
}

/// POST /candidates/:id/signature response ({ id, signedAt }).
class SignatureSaveResult {
  final int id;
  final String signedAt;

  SignatureSaveResult({required this.id, required this.signedAt});

  factory SignatureSaveResult.fromJson(Map<String, dynamic> json) {
    return SignatureSaveResult(
      id: json['id'] as int,
      signedAt: json['signedAt']?.toString() ?? '',
    );
  }
}

/// POST /candidates/:id/photo response ({ id, capturedAt }).
class PhotoSaveResult {
  final int id;
  final String capturedAt;

  PhotoSaveResult({required this.id, required this.capturedAt});

  factory PhotoSaveResult.fromJson(Map<String, dynamic> json) {
    return PhotoSaveResult(
      id: json['id'] as int,
      capturedAt: json['capturedAt']?.toString() ?? '',
    );
  }
}
