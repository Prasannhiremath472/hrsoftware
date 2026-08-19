/// GET /settings returns the application_settings key/value table flattened
/// into a single object. Values are stored as TEXT, so booleans arrive as
/// the strings "true"/"false" and numbers as strings.
class AppSettings {
  final String candidateNumberPrefix;
  final String maxFileSizeMb;
  final String requireOriginalVerification;
  final String requireBiometric;
  final String requireSignature;
  final String requireDeclaration;

  AppSettings({
    required this.candidateNumberPrefix,
    required this.maxFileSizeMb,
    required this.requireOriginalVerification,
    required this.requireBiometric,
    required this.requireSignature,
    required this.requireDeclaration,
  });

  factory AppSettings.fromJson(Map<String, dynamic> json) {
    return AppSettings(
      candidateNumberPrefix: json['candidate_number_prefix']?.toString() ?? 'CAN',
      maxFileSizeMb: json['max_file_size_mb']?.toString() ?? '10',
      requireOriginalVerification: json['require_original_verification']?.toString() ?? 'true',
      requireBiometric: json['require_biometric']?.toString() ?? 'true',
      requireSignature: json['require_signature']?.toString() ?? 'true',
      requireDeclaration: json['require_declaration']?.toString() ?? 'true',
    );
  }

  Map<String, dynamic> toJson() => {
        'candidate_number_prefix': candidateNumberPrefix,
        'max_file_size_mb': maxFileSizeMb,
        'require_original_verification': requireOriginalVerification,
        'require_biometric': requireBiometric,
        'require_signature': requireSignature,
        'require_declaration': requireDeclaration,
      };

  static bool isFlagOn(String value) => value.toLowerCase() == 'true';
}

const List<List<String>> settingFlags = [
  ['require_original_verification', 'Require Original Verification'],
  ['require_biometric', 'Require Biometric Capture'],
  ['require_signature', 'Require Signature'],
  ['require_declaration', 'Require Declaration'],
];
