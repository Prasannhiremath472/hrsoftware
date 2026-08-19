import '../models/candidate.dart';

/// Canonical wizard step order — mirrors backend
/// src/services/wizardProgressService.js STEP_ORDER exactly, plus the
/// client-only REVIEW step at the end (frontend/src/pages/onboarding/wizardSteps.ts).
enum WizardStepKey {
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
  review,
}

class WizardStepMeta {
  final WizardStepKey key;
  final String label;
  final String shortLabel;

  const WizardStepMeta({required this.key, required this.label, required this.shortLabel});
}

const List<WizardStepMeta> kWizardSteps = [
  WizardStepMeta(key: WizardStepKey.registration, label: 'Registration', shortLabel: 'Register'),
  WizardStepMeta(key: WizardStepKey.kyc, label: 'KYC', shortLabel: 'KYC'),
  WizardStepMeta(key: WizardStepKey.address, label: 'Address', shortLabel: 'Address'),
  WizardStepMeta(key: WizardStepKey.documentChecklist, label: 'Documents', shortLabel: 'Docs'),
  WizardStepMeta(key: WizardStepKey.documentUpload, label: 'Document Upload', shortLabel: 'Upload'),
  WizardStepMeta(key: WizardStepKey.verification, label: 'Document Verification', shortLabel: 'Verify'),
  WizardStepMeta(key: WizardStepKey.originalVerification, label: 'Original Verification', shortLabel: 'Originals'),
  WizardStepMeta(key: WizardStepKey.photo, label: 'Photo', shortLabel: 'Photo'),
  WizardStepMeta(key: WizardStepKey.leftBiometric, label: 'Left Hand Biometric', shortLabel: 'Left Hand'),
  WizardStepMeta(key: WizardStepKey.rightBiometric, label: 'Right Hand Biometric', shortLabel: 'Right Hand'),
  WizardStepMeta(key: WizardStepKey.declaration, label: 'Declaration', shortLabel: 'Declare'),
  WizardStepMeta(key: WizardStepKey.signature, label: 'Signature', shortLabel: 'Sign'),
  WizardStepMeta(key: WizardStepKey.review, label: 'Final Review', shortLabel: 'Review'),
];

int wizardStepIndex(WizardStepKey key) => kWizardSteps.indexWhere((s) => s.key == key);

/// The server records the step a candidate has *completed*; the wizard opens
/// on the step that comes next. Mirrors frontend RESUME_STEP exactly.
WizardStepKey resumeStepFor(CandidateStep step) {
  switch (step) {
    case CandidateStep.registration:
      return WizardStepKey.kyc;
    case CandidateStep.kyc:
      return WizardStepKey.address;
    case CandidateStep.address:
      return WizardStepKey.documentChecklist;
    case CandidateStep.documentChecklist:
      return WizardStepKey.documentUpload;
    case CandidateStep.documentUpload:
      return WizardStepKey.verification;
    case CandidateStep.verification:
      return WizardStepKey.originalVerification;
    case CandidateStep.originalVerification:
      return WizardStepKey.photo;
    case CandidateStep.photo:
      return WizardStepKey.leftBiometric;
    case CandidateStep.leftBiometric:
      return WizardStepKey.rightBiometric;
    case CandidateStep.rightBiometric:
      return WizardStepKey.declaration;
    case CandidateStep.declaration:
      return WizardStepKey.signature;
    case CandidateStep.signature:
      return WizardStepKey.review;
    case CandidateStep.submitted:
      return WizardStepKey.review;
  }
}
