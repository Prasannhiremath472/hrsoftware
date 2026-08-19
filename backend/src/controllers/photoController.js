const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const photoModel = require('../models/photoModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const storageService = require('../services/storageService');
const { markStepComplete } = require('../services/wizardProgressService');

function decodeBase64Image(dataUrl) {
  const match = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[3], 'base64') };
}

const capturePhoto = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  let buffer;
  let mimeType;

  if (req.file) {
    buffer = req.file.buffer;
    mimeType = req.file.mimetype;
  } else if (req.body.photoBase64) {
    const decoded = decodeBase64Image(req.body.photoBase64);
    if (!decoded) return fail(res, 'Invalid image data', 400);
    buffer = decoded.buffer;
    mimeType = decoded.mimeType;
  } else {
    return fail(res, 'A photo file or base64 image is required', 400);
  }

  if (!['image/png', 'image/jpeg', 'image/jpg'].includes(mimeType)) {
    return fail(res, 'Only PNG/JPEG photos are allowed', 400);
  }

  const { storedFilename, storagePath } = await storageService.saveBuffer({
    category: 'photos',
    candidateId: candidate.id,
    buffer,
    mimeType,
  });

  const photo = await photoModel.upsert(candidate.id, { storedFilename, storagePath, mimeType, capturedBy: req.user.id });

  await markStepComplete(candidate, 'PHOTO', req.user.id, 'Photo captured');

  await auditLogModel.record({
    userId: req.user.id,
    action: 'CAPTURE_PHOTO',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Photo captured for candidate ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, { id: photo.id, capturedAt: photo.captured_at }, 'Photo saved');
});

const streamPhoto = asyncHandler(async (req, res) => {
  const photo = await photoModel.findByCandidateId(req.params.id);
  if (!photo) return fail(res, 'Photo not found', 404);
  const absolutePath = storageService.resolveAbsolutePath(photo.storage_path);
  res.setHeader('Content-Type', photo.mime_type);
  return res.sendFile(absolutePath);
});

module.exports = { capturePhoto, streamPhoto };
