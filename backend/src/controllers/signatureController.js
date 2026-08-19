const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const signatureModel = require('../models/signatureModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const storageService = require('../services/storageService');
const { markStepComplete } = require('../services/wizardProgressService');

const saveSignature = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const match = /^data:image\/png;base64,(.+)$/.exec(req.body.signatureBase64 || '');
  if (!match) return fail(res, 'A base64 PNG signature is required', 400);

  const buffer = Buffer.from(match[1], 'base64');
  const { storedFilename, storagePath } = await storageService.saveBuffer({
    category: 'signatures',
    candidateId: candidate.id,
    buffer,
    mimeType: 'image/png',
  });

  const signature = await signatureModel.upsert(candidate.id, { storedFilename, storagePath });

  await markStepComplete(candidate, 'SIGNATURE', req.user.id, 'Signature captured');

  await auditLogModel.record({
    userId: req.user.id,
    action: 'SAVE_SIGNATURE',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Signature captured for candidate ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, { id: signature.id, signedAt: signature.signed_at }, 'Signature saved');
});

const streamSignature = asyncHandler(async (req, res) => {
  const signature = await signatureModel.findByCandidateId(req.params.id);
  if (!signature) return fail(res, 'Signature not found', 404);
  const absolutePath = storageService.resolveAbsolutePath(signature.storage_path);
  res.setHeader('Content-Type', 'image/png');
  return res.sendFile(absolutePath);
});

module.exports = { saveSignature, streamSignature };
