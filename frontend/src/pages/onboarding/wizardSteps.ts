import type { CandidateStep } from '@/types';

/** Wizard step keys — a superset of the server's `current_step` values. */
export type WizardStepKey =
  | 'REGISTRATION'
  | 'KYC'
  | 'ADDRESS'
  | 'DOCUMENT_CHECKLIST'
  | 'DOCUMENT_UPLOAD'
  | 'VERIFICATION'
  | 'ORIGINAL_VERIFICATION'
  | 'PHOTO'
  | 'LEFT_BIOMETRIC'
  | 'RIGHT_BIOMETRIC'
  | 'DECLARATION'
  | 'SIGNATURE'
  | 'REVIEW';

export interface WizardStep {
  key: WizardStepKey;
  label: string;
  /** Compact label for the narrow-screen stepper. */
  shortLabel: string;
}

export const STEPS: WizardStep[] = [
  { key: 'REGISTRATION', label: 'Registration', shortLabel: 'Register' },
  { key: 'KYC', label: 'KYC', shortLabel: 'KYC' },
  { key: 'ADDRESS', label: 'Address', shortLabel: 'Address' },
  { key: 'DOCUMENT_CHECKLIST', label: 'Documents', shortLabel: 'Docs' },
  { key: 'DOCUMENT_UPLOAD', label: 'Document Upload', shortLabel: 'Upload' },
  { key: 'VERIFICATION', label: 'Document Verification', shortLabel: 'Verify' },
  { key: 'ORIGINAL_VERIFICATION', label: 'Original Verification', shortLabel: 'Originals' },
  { key: 'PHOTO', label: 'Photo', shortLabel: 'Photo' },
  { key: 'LEFT_BIOMETRIC', label: 'Left Hand Biometric', shortLabel: 'Left Hand' },
  { key: 'RIGHT_BIOMETRIC', label: 'Right Hand Biometric', shortLabel: 'Right Hand' },
  { key: 'DECLARATION', label: 'Declaration', shortLabel: 'Declare' },
  { key: 'SIGNATURE', label: 'Signature', shortLabel: 'Sign' },
  { key: 'REVIEW', label: 'Final Review', shortLabel: 'Review' },
];

export function stepIndex(key: WizardStepKey): number {
  return STEPS.findIndex((s) => s.key === key);
}

/**
 * The server records the step a candidate has *completed*; the wizard opens on
 * the step that comes next.
 */
export const RESUME_STEP: Record<CandidateStep, WizardStepKey> = {
  REGISTRATION: 'KYC',
  KYC: 'ADDRESS',
  ADDRESS: 'DOCUMENT_CHECKLIST',
  DOCUMENT_CHECKLIST: 'DOCUMENT_UPLOAD',
  DOCUMENT_UPLOAD: 'VERIFICATION',
  VERIFICATION: 'ORIGINAL_VERIFICATION',
  ORIGINAL_VERIFICATION: 'PHOTO',
  PHOTO: 'LEFT_BIOMETRIC',
  LEFT_BIOMETRIC: 'RIGHT_BIOMETRIC',
  RIGHT_BIOMETRIC: 'DECLARATION',
  DECLARATION: 'SIGNATURE',
  SIGNATURE: 'REVIEW',
  SUBMITTED: 'REVIEW',
};

/** Shared props every wizard step receives from the shell. */
export interface WizardStepProps {
  candidateId: string;
  candidate: import('@/types').Candidate;
  /** Re-fetches the candidate so the header/status stays in sync after a save. */
  onSaved: () => Promise<unknown>;
  goNext: () => void;
}
