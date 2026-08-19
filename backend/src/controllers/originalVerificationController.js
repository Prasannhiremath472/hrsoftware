const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const originalVerificationModel = require('../models/originalVerificationModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const { markStepComplete } = require('../services/wizardProgressService');

const getOriginalVerification = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  const record = await originalVerificationModel.findByCandidateId(req.params.id);
  return ok(res, record, 'OK');
});

const putOriginalVerification = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const record = await originalVerificationModel.upsert(req.params.id, {
    originalsVerified: req.body.originalsVerified,
    selfAttestedReceived: req.body.selfAttestedReceived,
    verifiedBy: req.user.id,
  });

  if (record.originals_verified && record.self_attested_received) {
    await markStepComplete(candidate, 'ORIGINAL_VERIFICATION', req.user.id, 'Original verification completed');
  }

  await auditLogModel.record({
    userId: req.user.id,
    action: 'ORIGINAL_VERIFICATION',
    entityType: 'CANDIDATE',
    entityId: req.params.id,
    description: `Original document verification recorded for ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, record, 'Original verification saved');
});

module.exports = { getOriginalVerification, putOriginalVerification };
