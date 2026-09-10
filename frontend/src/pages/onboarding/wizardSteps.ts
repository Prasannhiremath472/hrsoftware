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
  /**
   * KYC and Address are now captured together with Registration in a single
   * combined step (RegistrationStep), so they no longer appear in the
   * visible stepper on their own. They stay in STEPS (rather than being
   * removed) so goToStep()/stepState() ordering and ReviewStep's "Edit"
   * links back into KYC/Address for corrections keep working.
   */
  hidden?: boolean;
}

export const STEPS: WizardStep[] = [
  { key: 'REGISTRATION', label: 'Registration', shortLabel: 'Register' },
  { key: 'KYC', label: 'KYC', shortLabel: 'KYC', hidden: true },
  { key: 'ADDRESS', label: 'Address', shortLabel: 'Address', hidden: true },
  { key: 'DOCUMENT_CHECKLIST', label: 'Documents', shortLabel: 'Docs' },
  { key: 'DOCUMENT_UPLOAD', label: 'Document Upload', shortLabel: 'Upload', hidden: true },
  { key: 'VERIFICATION', label: 'Document Verification', shortLabel: 'Verify', hidden: true },
  { key: 'ORIGINAL_VERIFICATION', label: 'Original Verification', shortLabel: 'Originals', hidden: true },
  { key: 'PHOTO', label: 'Photo', shortLabel: 'Photo' },
  { key: 'LEFT_BIOMETRIC', label: 'Left Hand Biometric', shortLabel: 'Left Hand' },
  { key: 'RIGHT_BIOMETRIC', label: 'Right Hand Biometric', shortLabel: 'Right Hand' },
  { key: 'DECLARATION', label: 'Declaration', shortLabel: 'Declare' },
  // Signature is removed from the onboarding flow — the key stays (server's
  // current_step enum and candidate_signatures table are untouched) but is
  // hidden so it can never be reached via the stepper or forward navigation.
  { key: 'SIGNATURE', label: 'Signature', shortLabel: 'Sign', hidden: true },
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
  // Registration now captures KYC and Address up front, so a candidate
  // still sitting at REGISTRATION (e.g. an old/incomplete draft) resumes
  // straight at Documents rather than the now-hidden KYC/Address steps.
  REGISTRATION: 'DOCUMENT_CHECKLIST',
  KYC: 'DOCUMENT_CHECKLIST',
  ADDRESS: 'DOCUMENT_CHECKLIST',
  // Checklist, Upload, Verification and Original Verification are now one
  // combined Documents step — resuming from any of them (having completed
  // that much server-side) reopens the same merged screen, which shows
  // exactly the sub-sections still outstanding.
  DOCUMENT_CHECKLIST: 'DOCUMENT_CHECKLIST',
  DOCUMENT_UPLOAD: 'DOCUMENT_CHECKLIST',
  VERIFICATION: 'DOCUMENT_CHECKLIST',
  ORIGINAL_VERIFICATION: 'PHOTO',
  PHOTO: 'LEFT_BIOMETRIC',
  LEFT_BIOMETRIC: 'RIGHT_BIOMETRIC',
  RIGHT_BIOMETRIC: 'DECLARATION',
  // Signature is skipped — a candidate whose server-side current_step is
  // still DECLARATION or SIGNATURE (from before this step was removed, or
  // just completed Declaration) resumes straight at Final Review.
  DECLARATION: 'REVIEW',
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

/**
 * Props for RegistrationStep specifically. Unlike every other step, it can
 * run before a candidate exists (candidateId/candidate are null in that
 * "new" mode) — creation happens as part of that step's own submit.
 */
export interface RegistrationStepProps {
  candidateId: string | null;
  candidate: import('@/types').Candidate | null;
  onSaved: () => Promise<unknown>;
  goNext: () => void;
  /** Called after a brand-new candidate is created, with its id. */
  onCreated: (candidateId: number) => void;
}
