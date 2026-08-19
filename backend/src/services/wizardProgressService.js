const candidateModel = require('../models/candidateModel');

/**
 * Canonical wizard step order. `current_step` on a candidate record means
 * "the step that was most recently completed" — mirrors
 * frontend/src/pages/onboarding/wizardSteps.ts (RESUME_STEP consumes this
 * same value to decide which step to open next). Keep both in sync.
 */
const STEP_ORDER = [
  'REGISTRATION',
  'KYC',
  'ADDRESS',
  'DOCUMENT_CHECKLIST',
  'DOCUMENT_UPLOAD',
  'VERIFICATION',
  'ORIGINAL_VERIFICATION',
  'PHOTO',
  'LEFT_BIOMETRIC',
  'RIGHT_BIOMETRIC',
  'DECLARATION',
  'SIGNATURE',
  'REVIEW',
];

/** Status shown in the UI (StatusBadge) once a given step has been completed. */
const STATUS_AFTER_STEP = {
  REGISTRATION: 'DRAFT',
  KYC: 'KYC_PENDING',
  ADDRESS: 'ADDRESS_PENDING',
  DOCUMENT_CHECKLIST: 'DOCUMENT_PENDING',
  DOCUMENT_UPLOAD: 'DOCUMENT_VERIFICATION_PENDING',
  VERIFICATION: 'DOCUMENT_VERIFICATION_PENDING',
  ORIGINAL_VERIFICATION: 'DOCUMENT_VERIFICATION_PENDING',
  PHOTO: 'BIOMETRIC_PENDING',
  LEFT_BIOMETRIC: 'BIOMETRIC_PENDING',
  RIGHT_BIOMETRIC: 'BIOMETRIC_PENDING',
  DECLARATION: 'BIOMETRIC_PENDING',
  SIGNATURE: 'BIOMETRIC_PENDING',
  REVIEW: 'BIOMETRIC_PENDING',
};

function indexOf(step) {
  const i = STEP_ORDER.indexOf(step);
  return i === -1 ? 0 : i;
}

/**
 * Marks `completedStep` as done on a candidate: advances `current_step` and
 * derives `status` accordingly, but only ever moves forward — revisiting an
 * earlier step (e.g. editing KYC after already reaching Biometric) never
 * regresses progress that's already been made.
 *
 * Terminal statuses (COMPLETED, REJECTED) are left untouched — submission
 * and rejection are handled by their own explicit flows, not step saves.
 */
async function markStepComplete(candidate, completedStep, userId, remarks) {
  if (candidate.status === 'COMPLETED' || candidate.status === 'REJECTED') return;

  if (indexOf(completedStep) > indexOf(candidate.current_step)) {
    await candidateModel.updateStep(candidate.id, completedStep);
  }

  const nextStatus = STATUS_AFTER_STEP[completedStep];
  if (nextStatus && nextStatus !== candidate.status) {
    await candidateModel.updateStatus(candidate.id, nextStatus, userId, remarks);
  }
}

module.exports = { STEP_ORDER, markStepComplete };
