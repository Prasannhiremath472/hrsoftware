/// CandidateStatus — matches backend candidates.status values exactly.
enum CandidateStatus {
  draft,
  kycPending,
  addressPending,
  documentPending,
  documentVerificationPending,
  biometricPending,
  completed,
  rejected,
}

const Map<String, CandidateStatus> _statusFromString = {
  'DRAFT': CandidateStatus.draft,
  'KYC_PENDING': CandidateStatus.kycPending,
  'ADDRESS_PENDING': CandidateStatus.addressPending,
  'DOCUMENT_PENDING': CandidateStatus.documentPending,
  'DOCUMENT_VERIFICATION_PENDING': CandidateStatus.documentVerificationPending,
  'BIOMETRIC_PENDING': CandidateStatus.biometricPending,
  'COMPLETED': CandidateStatus.completed,
  'REJECTED': CandidateStatus.rejected,
};

const Map<CandidateStatus, String> _statusToString = {
  CandidateStatus.draft: 'DRAFT',
  CandidateStatus.kycPending: 'KYC_PENDING',
  CandidateStatus.addressPending: 'ADDRESS_PENDING',
  CandidateStatus.documentPending: 'DOCUMENT_PENDING',
  CandidateStatus.documentVerificationPending: 'DOCUMENT_VERIFICATION_PENDING',
  CandidateStatus.biometricPending: 'BIOMETRIC_PENDING',
  CandidateStatus.completed: 'COMPLETED',
  CandidateStatus.rejected: 'REJECTED',
};

CandidateStatus candidateStatusFromString(String value) =>
    _statusFromString[value] ?? CandidateStatus.draft;

String candidateStatusToString(CandidateStatus status) => _statusToString[status]!;

String candidateStatusLabel(CandidateStatus status) {
  switch (status) {
    case CandidateStatus.draft:
      return 'Draft';
    case CandidateStatus.kycPending:
      return 'KYC Pending';
    case CandidateStatus.addressPending:
      return 'Address Pending';
    case CandidateStatus.documentPending:
      return 'Document Pending';
    case CandidateStatus.documentVerificationPending:
      return 'Doc. Verification Pending';
    case CandidateStatus.biometricPending:
      return 'Biometric Pending';
    case CandidateStatus.completed:
      return 'Completed';
    case CandidateStatus.rejected:
      return 'Rejected';
  }
}

/// Server-side progress marker (candidates.current_step). Records the step
/// just COMPLETED — resume-on-reopen opens the NEXT step (see
/// core/wizard_steps.dart RESUME_STEP map).
enum CandidateStep {
  registration,
  kyc,
  address,
  documentChecklist,
  documentUpload,
  verification,
  originalVerification,
  photo,
  leftBiometric,
  rightBiometric,
  declaration,
  signature,
  submitted,
}

const Map<String, CandidateStep> _stepFromString = {
  'REGISTRATION': CandidateStep.registration,
  'KYC': CandidateStep.kyc,
  'ADDRESS': CandidateStep.address,
  'DOCUMENT_CHECKLIST': CandidateStep.documentChecklist,
  'DOCUMENT_UPLOAD': CandidateStep.documentUpload,
  'VERIFICATION': CandidateStep.verification,
  'ORIGINAL_VERIFICATION': CandidateStep.originalVerification,
  'PHOTO': CandidateStep.photo,
  'LEFT_BIOMETRIC': CandidateStep.leftBiometric,
  'RIGHT_BIOMETRIC': CandidateStep.rightBiometric,
  'DECLARATION': CandidateStep.declaration,
  'SIGNATURE': CandidateStep.signature,
  'SUBMITTED': CandidateStep.submitted,
};

const Map<CandidateStep, String> _stepToString = {
  CandidateStep.registration: 'REGISTRATION',
  CandidateStep.kyc: 'KYC',
  CandidateStep.address: 'ADDRESS',
  CandidateStep.documentChecklist: 'DOCUMENT_CHECKLIST',
  CandidateStep.documentUpload: 'DOCUMENT_UPLOAD',
  CandidateStep.verification: 'VERIFICATION',
  CandidateStep.originalVerification: 'ORIGINAL_VERIFICATION',
  CandidateStep.photo: 'PHOTO',
  CandidateStep.leftBiometric: 'LEFT_BIOMETRIC',
  CandidateStep.rightBiometric: 'RIGHT_BIOMETRIC',
  CandidateStep.declaration: 'DECLARATION',
  CandidateStep.signature: 'SIGNATURE',
  CandidateStep.submitted: 'SUBMITTED',
};

CandidateStep candidateStepFromString(String value) =>
    _stepFromString[value] ?? CandidateStep.registration;

String candidateStepToString(CandidateStep step) => _stepToString[step]!;

enum Gender { male, female, other }

Gender? genderFromString(String? value) {
  switch (value) {
    case 'MALE':
      return Gender.male;
    case 'FEMALE':
      return Gender.female;
    case 'OTHER':
      return Gender.other;
  }
  return null;
}

String genderToString(Gender gender) {
  switch (gender) {
    case Gender.male:
      return 'MALE';
    case Gender.female:
      return 'FEMALE';
    case Gender.other:
      return 'OTHER';
  }
}

class Candidate {
  final int id;
  final String candidateNumber;
  final String fullName;
  final String mobile;
  final String? email;
  final String? dob;
  final Gender? gender;
  final int? coordinatorId;
  final String? coordinatorName;
  final CandidateStatus status;
  final CandidateStep currentStep;
  final String? submittedAt;
  final String createdAt;
  final String updatedAt;

  Candidate({
    required this.id,
    required this.candidateNumber,
    required this.fullName,
    required this.mobile,
    this.email,
    this.dob,
    this.gender,
    this.coordinatorId,
    this.coordinatorName,
    required this.status,
    required this.currentStep,
    this.submittedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Candidate.fromJson(Map<String, dynamic> json) {
    return Candidate(
      id: json['id'] as int,
      candidateNumber: json['candidate_number'] as String,
      fullName: json['full_name'] as String,
      mobile: json['mobile'] as String,
      email: json['email'] as String?,
      dob: json['dob'] as String?,
      gender: genderFromString(json['gender'] as String?),
      coordinatorId: json['coordinator_id'] as int?,
      coordinatorName: json['coordinator_name'] as String?,
      status: candidateStatusFromString(json['status'] as String),
      currentStep: candidateStepFromString(json['current_step'] as String),
      submittedAt: json['submitted_at'] as String?,
      createdAt: json['created_at']?.toString() ?? '',
      updatedAt: json['updated_at']?.toString() ?? '',
    );
  }
}

/// Request payload for POST /candidates.
class CandidateRegistrationPayload {
  final String fullName;
  final String mobile;
  final String? email;
  final String? dob;
  final Gender? gender;
  final int? coordinatorId;

  CandidateRegistrationPayload({
    required this.fullName,
    required this.mobile,
    this.email,
    this.dob,
    this.gender,
    this.coordinatorId,
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{'fullName': fullName, 'mobile': mobile};
    if (email != null && email!.isNotEmpty) map['email'] = email;
    if (dob != null && dob!.isNotEmpty) map['dob'] = dob;
    if (gender != null) map['gender'] = genderToString(gender!);
    if (coordinatorId != null) map['coordinatorId'] = coordinatorId;
    return map;
  }
}

class StatusHistoryEntry {
  final int id;
  final int candidateId;
  final String? oldStatus;
  final String newStatus;
  final int? changedBy;
  final String? remarks;
  final String createdAt;

  StatusHistoryEntry({
    required this.id,
    required this.candidateId,
    this.oldStatus,
    required this.newStatus,
    this.changedBy,
    this.remarks,
    required this.createdAt,
  });

  factory StatusHistoryEntry.fromJson(Map<String, dynamic> json) {
    return StatusHistoryEntry(
      id: json['id'] as int,
      candidateId: json['candidate_id'] as int,
      oldStatus: json['old_status'] as String?,
      newStatus: json['new_status'] as String,
      changedBy: json['changed_by'] as int?,
      remarks: json['remarks'] as String?,
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}
