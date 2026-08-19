enum BiometricHand { leftHand, rightHand }

BiometricHand biometricHandFromString(String value) =>
    value == 'RIGHT_HAND' ? BiometricHand.rightHand : BiometricHand.leftHand;

String biometricHandToString(BiometricHand hand) =>
    hand == BiometricHand.leftHand ? 'LEFT_HAND' : 'RIGHT_HAND';

String biometricHandLabel(BiometricHand hand) =>
    hand == BiometricHand.leftHand ? 'Left Hand' : 'Right Hand';

enum BiometricVerificationStatus { captured, verified, failed }

BiometricVerificationStatus biometricVerificationStatusFromString(String value) {
  switch (value) {
    case 'VERIFIED':
      return BiometricVerificationStatus.verified;
    case 'FAILED':
      return BiometricVerificationStatus.failed;
    case 'CAPTURED':
    default:
      return BiometricVerificationStatus.captured;
  }
}

/// GET /candidates/:id/biometric — no raw fingerprint data, only an opaque
/// capture reference + quality score. This mirrors the backend's mock
/// provider; there is NO real fingerprint SDK integration anywhere here.
class BiometricRecord {
  final int id;
  final int candidateId;
  final BiometricHand hand;
  final String provider;
  final String captureReference;
  final double qualityScore;
  final String? deviceInfo;
  final BiometricVerificationStatus verificationStatus;
  final String capturedAt;

  BiometricRecord({
    required this.id,
    required this.candidateId,
    required this.hand,
    required this.provider,
    required this.captureReference,
    required this.qualityScore,
    this.deviceInfo,
    required this.verificationStatus,
    required this.capturedAt,
  });

  factory BiometricRecord.fromJson(Map<String, dynamic> json) {
    final rawScore = json['quality_score'];
    double score;
    if (rawScore is num) {
      score = rawScore.toDouble();
    } else {
      score = double.tryParse(rawScore?.toString() ?? '') ?? 0;
    }
    return BiometricRecord(
      id: json['id'] as int,
      candidateId: json['candidate_id'] as int,
      hand: biometricHandFromString(json['hand'] as String),
      provider: json['provider'] as String? ?? 'mock',
      captureReference: json['capture_reference'] as String? ?? '',
      qualityScore: score,
      deviceInfo: json['device_info'] as String?,
      verificationStatus:
          biometricVerificationStatusFromString(json['verification_status'] as String? ?? 'CAPTURED'),
      capturedAt: json['captured_at']?.toString() ?? '',
    );
  }
}

/// GET /biometric/device-status — mock provider status.
class BiometricDeviceStatus {
  final String provider;
  final bool connected;
  final String deviceName;

  BiometricDeviceStatus({required this.provider, required this.connected, required this.deviceName});

  factory BiometricDeviceStatus.fromJson(Map<String, dynamic> json) {
    return BiometricDeviceStatus(
      provider: json['provider'] as String? ?? 'mock',
      connected: json['connected'] == true,
      deviceName: json['deviceName'] as String? ?? 'Unknown device',
    );
  }
}

class BiometricVerifyResult {
  final bool verified;
  final double confidence;

  BiometricVerifyResult({required this.verified, required this.confidence});

  factory BiometricVerifyResult.fromJson(Map<String, dynamic> json) {
    final raw = json['confidence'];
    double confidence;
    if (raw is num) {
      confidence = raw.toDouble();
    } else {
      confidence = double.tryParse(raw?.toString() ?? '') ?? 0;
    }
    return BiometricVerifyResult(verified: json['verified'] == true, confidence: confidence);
  }
}
