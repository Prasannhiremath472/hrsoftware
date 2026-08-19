const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const kycModel = require('../models/kycModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const { maskAadhaar, maskPan } = require('../utils/mask');
const kycProviderAdapter = require('../services/kyc/providerAdapter');
const { markStepComplete } = require('../services/wizardProgressService');

function maskKyc(kyc) {
  if (!kyc) return kyc;
  return { ...kyc, aadhaar_number: maskAadhaar(kyc.aadhaar_number), pan_number: maskPan(kyc.pan_number) };
}

const getKyc = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  const kyc = await kycModel.findByCandidateId(req.params.id);
  return ok(res, maskKyc(kyc), 'OK');
});

const putKyc = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const kyc = await kycModel.upsert(req.params.id, req.body);

  // Manual KYC mode note is recorded but never presented as a government-verified check.
  await kycProviderAdapter.verifyIdentity({
    panNumber: req.body.panNumber,
    aadhaarNumber: req.body.aadhaarNumber,
    applicantName: req.body.applicantName,
  }).catch(() => null);

  if (kyc.is_completed) {
    await markStepComplete(candidate, 'KYC', req.user.id, 'KYC step completed');
  }

  await auditLogModel.record({
    userId: req.user.id,
    action: 'UPDATE_KYC',
    entityType: 'CANDIDATE',
    entityId: req.params.id,
    description: `KYC details saved for candidate ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, maskKyc(kyc), 'KYC details saved');
});

module.exports = { getKyc, putKyc };
