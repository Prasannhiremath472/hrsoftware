import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/address_service.dart';
import '../services/audit_log_service.dart';
import '../services/biometric_service.dart';
import '../services/candidate_service.dart';
import '../services/coordinator_service.dart';
import '../services/declaration_service.dart';
import '../services/document_service.dart';
import '../services/kyc_service.dart';
import '../services/original_verification_service.dart';
import '../services/photo_service.dart';
import '../services/report_service.dart';
import '../services/settings_service.dart';
import '../services/signature_service.dart';

/// Simple singleton service providers — each service is a thin, stateless
/// Dio wrapper, so no need for anything more elaborate than Provider().
final coordinatorServiceProvider = Provider((ref) => CoordinatorService());
final candidateServiceProvider = Provider((ref) => CandidateService());
final kycServiceProvider = Provider((ref) => KycService());
final addressServiceProvider = Provider((ref) => AddressService());
final documentServiceProvider = Provider((ref) => DocumentService());
final photoServiceProvider = Provider((ref) => PhotoService());
final biometricServiceProvider = Provider((ref) => BiometricService());
final declarationServiceProvider = Provider((ref) => DeclarationService());
final signatureServiceProvider = Provider((ref) => SignatureService());
final originalVerificationServiceProvider = Provider((ref) => OriginalVerificationService());
final settingsServiceProvider = Provider((ref) => SettingsService());
final reportServiceProvider = Provider((ref) => ReportService());
final auditLogServiceProvider = Provider((ref) => AuditLogService());
