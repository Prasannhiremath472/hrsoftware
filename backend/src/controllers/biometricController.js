const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const biometricModel = require('../models/biometricModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const biometricService = require('../biometric/biometricService');
const { markStepComplete } = require('../services/wizardProgressService');

const deviceStatus = asyncHandler(async (req, res) => {
  const status = await biometricService.getDeviceStatus();
  return ok(res, status, 'OK');
});

const capture = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const { hand, clientCapture } = req.body;
  // clientCapture is supplied by RD Service-backed clients (see
  // biometric/providers/rdServiceProvider.js); the mock provider ignores it.
  const result = await biometricService.capture({ candidateId: candidate.id, hand, clientCapture });

  const record = await biometricModel.upsert(candidate.id, {
    hand,
    provider: biometricService.providerName,
    captureReference: result.captureReference,
    qualityScore: result.qualityScore,
    deviceInfo: result.deviceInfo,
    capturedBy: req.user.id,
  });

  const completedStep = hand === 'LEFT_HAND' ? 'LEFT_BIOMETRIC' : 'RIGHT_BIOMETRIC';
  await markStepComplete(candidate, completedStep, req.user.id, `${hand} biometric captured`);

  await auditLogModel.record({
    userId: req.user.id,
    action: 'CAPTURE_BIOMETRIC',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `${hand} biometric captured for candidate ${candidate.full_name} (quality ${result.qualityScore})`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, record, 'Biometric captured');
});

const listForCandidate = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  const records = await biometricModel.listForCandidate(req.params.id);
  return ok(res, records, 'OK');
});

const verify = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const { hand } = req.body;
  const records = await biometricModel.listForCandidate(req.params.id);
  const record = records.find((r) => r.hand === hand);
  if (!record) return fail(res, `No ${hand} biometric capture found for this candidate`, 404);

  const result = await biometricService.verify({ captureReference: record.capture_reference });
  if (result.verified) {
    await biometricModel.setVerified(req.params.id, hand);
  }

  await auditLogModel.record({
    userId: req.user.id,
    action: 'VERIFY_BIOMETRIC',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `${hand} biometric verification for candidate ${candidate.full_name}: ${result.verified}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, result, 'Biometric verification complete');
});

module.exports = { deviceStatus, capture, listForCandidate, verify };
