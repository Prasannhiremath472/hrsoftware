const kycModel = require('../models/kycModel');
const addressModel = require('../models/addressModel');
const documentModel = require('../models/documentModel');
const documentTypeModel = require('../models/documentTypeModel');
const originalVerificationModel = require('../models/originalVerificationModel');
const photoModel = require('../models/photoModel');
const biometricModel = require('../models/biometricModel');
const declarationModel = require('../models/declarationModel');
const settingsService = require('../services/settingsService');

/**
 * Full server-side re-validation of onboarding completeness.
 * Returns { valid: boolean, errors: string[] }.
 * Never trust the frontend's own completeness checks — this is authoritative.
 */
async function validateForSubmit(candidateId) {
  const errors = [];
  const settings = await settingsService.getAll();

  const kyc = await kycModel.findByCandidateId(candidateId);
  if (!kyc || !kyc.is_completed) errors.push('KYC details are incomplete');

  const address = await addressModel.findByCandidateId(candidateId);
  if (!address || !address.is_completed) errors.push('Address details are incomplete');

  const mandatoryTypes = await documentTypeModel.list({ activeOnly: true });
  const requiredMandatory = mandatoryTypes.filter((t) => t.is_mandatory);
  const documents = await documentModel.listForCandidate(candidateId);
  for (const type of requiredMandatory) {
    const doc = documents.find((d) => d.document_type_id === type.id);
    if (!doc) errors.push(`Missing mandatory document: ${type.name}`);
    else if (doc.status === 'REJECTED') errors.push(`Document rejected and needs re-upload: ${type.name}`);
  }
  const pendingVerification = documents.filter((d) => d.status === 'UPLOADED');
  if (pendingVerification.length) errors.push(`${pendingVerification.length} document(s) still pending verification`);

  if (settingsService.asBool(settings.require_original_verification)) {
    const ov = await originalVerificationModel.findByCandidateId(candidateId);
    if (!ov || !ov.originals_verified || !ov.self_attested_received) {
      errors.push('Original document verification is incomplete');
    }
  }

  const photo = await photoModel.findByCandidateId(candidateId);
  if (!photo) errors.push('Candidate photo is missing');

  if (settingsService.asBool(settings.require_biometric)) {
    const biometrics = await biometricModel.listForCandidate(candidateId);
    const hands = biometrics.map((b) => b.hand);
    if (!hands.includes('LEFT_HAND')) errors.push('Left hand biometric capture is missing');
    if (!hands.includes('RIGHT_HAND')) errors.push('Right hand biometric capture is missing');
  }

  if (settingsService.asBool(settings.require_declaration)) {
    const declaration = await declarationModel.findByCandidateId(candidateId);
    if (!declaration || !declaration.accepted) errors.push('Declaration has not been accepted');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = { validateForSubmit };
