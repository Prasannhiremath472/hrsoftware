const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const declarationModel = require('../models/declarationModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const { markStepComplete } = require('../services/wizardProgressService');

const getDeclaration = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  return ok(res, await declarationModel.findByCandidateId(req.params.id), 'OK');
});

const putDeclaration = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const declaration = await declarationModel.upsert(req.params.id, {
    accepted: req.body.accepted,
    ipAddress: auditLogModel.ipFromReq(req),
  });

  if (declaration.accepted) {
    await markStepComplete(candidate, 'DECLARATION', req.user.id, 'Declaration accepted');
  }

  await auditLogModel.record({
    userId: req.user.id,
    action: 'ACCEPT_DECLARATION',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Declaration ${req.body.accepted ? 'accepted' : 'unaccepted'} for candidate ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, declaration, 'Declaration saved');
});

module.exports = { getDeclaration, putDeclaration };
