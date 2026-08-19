const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const addressModel = require('../models/addressModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const { markStepComplete } = require('../services/wizardProgressService');

const getAddress = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  const address = await addressModel.findByCandidateId(req.params.id);
  return ok(res, address, 'OK');
});

const putAddress = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const address = await addressModel.upsert(req.params.id, req.body);

  if (address.is_completed) {
    await markStepComplete(candidate, 'ADDRESS', req.user.id, 'Address step completed');
  }

  await auditLogModel.record({
    userId: req.user.id,
    action: 'UPDATE_ADDRESS',
    entityType: 'CANDIDATE',
    entityId: req.params.id,
    description: `Address details saved for candidate ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, address, 'Address details saved');
});

module.exports = { getAddress, putAddress };
