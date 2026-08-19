const asyncHandler = require('../middleware/asyncHandler');
const { ok, created, fail } = require('../utils/response');
const templateModel = require('../models/fingerprintTemplateModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const settingsService = require('../services/settingsService');
const matchService = require('../services/fingerprintMatchService');

/**
 * Fingerprint template capture and matching (Mantra non-Aadhaar SDK path).
 *
 * The template arrives from the operator's local agent via the browser — the
 * server never talks to the scanner. Templates are stored but never returned:
 * see fingerprintTemplateModel's SAFE_COLUMNS.
 */

/** POST /api/candidates/:id/fingerprints */
const enroll = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const { finger, template, templateFormat, qualityScore, deviceSerial, deviceModel, sdkVersion } = req.body;

  // Low-quality templates match badly, producing both false rejections and
  // missed duplicates — so reject them at capture time rather than storing
  // something that will quietly degrade matching later.
  const minQuality = Number(await settingsService.getOne('fingerprint_min_quality')) || 60;
  if (Number(qualityScore) < minQuality) {
    return fail(
      res,
      `Capture quality ${qualityScore} is below the minimum of ${minQuality}. Please re-scan with better finger placement.`,
      422
    );
  }

  // Optional duplicate check: does this fingerprint already belong to someone else?
  const duplicateCheckEnabled = settingsService.asBool(
    await settingsService.getOne('fingerprint_duplicate_check_on_capture')
  );

  let duplicate = null;
  if (duplicateCheckEnabled) {
    const search = await matchService.searchForDuplicate({
      template,
      excludeCandidateId: candidate.id,
    });

    await matchService.logMatch({
      matchType: 'SEARCH_1_N',
      probeCandidateId: candidate.id,
      matchedCandidateId: search.matchedCandidateId,
      finger,
      matchScore: search.score,
      thresholdUsed: search.threshold,
      matched: search.matched,
      candidatesCompared: search.candidatesCompared,
      performedBy: req.user.id,
      ipAddress: auditLogModel.ipFromReq(req),
    });

    if (search.matched) {
      const other = await candidateModel.findById(search.matchedCandidateId);
      duplicate = {
        candidateId: search.matchedCandidateId,
        candidateNumber: other?.candidate_number || null,
        candidateName: other?.full_name || null,
        finger: search.matchedFinger,
        score: search.score,
      };
    }
  }

  const record = await templateModel.upsert(candidate.id, {
    finger,
    template,
    templateFormat,
    qualityScore,
    deviceSerial,
    deviceModel,
    sdkVersion,
    capturedBy: req.user.id,
  });

  await auditLogModel.record({
    userId: req.user.id,
    action: 'ENROLL_FINGERPRINT',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    // Never log the template itself.
    description: `Fingerprint enrolled (${finger}, quality ${qualityScore}) for ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return created(res, { record, duplicate, matcherMode: matchService.matcherMode }, 'Fingerprint enrolled');
});

/** GET /api/candidates/:id/fingerprints — metadata only, never templates. */
const listForCandidate = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  return ok(res, await templateModel.listForCandidate(req.params.id), 'OK');
});

/** POST /api/candidates/:id/fingerprints/verify — 1:1 against this candidate. */
const verify = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const { finger, template } = req.body;
  const result = await matchService.verifyAgainstCandidate({
    candidateId: candidate.id,
    finger,
    template,
  });

  await matchService.logMatch({
    matchType: 'VERIFY_1_1',
    probeCandidateId: candidate.id,
    matchedCandidateId: result.matched ? candidate.id : null,
    finger,
    matchScore: result.score,
    thresholdUsed: result.threshold,
    matched: result.matched,
    performedBy: req.user.id,
    ipAddress: auditLogModel.ipFromReq(req),
  });

  await auditLogModel.record({
    userId: req.user.id,
    action: 'VERIFY_FINGERPRINT',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Fingerprint 1:1 verification for ${candidate.full_name}: ${result.matched ? 'MATCH' : 'NO MATCH'}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, { ...result, matcherMode: matchService.matcherMode }, 'Verification complete');
});

/** POST /api/fingerprints/search — 1:N duplicate search across all candidates. */
const search = asyncHandler(async (req, res) => {
  const { template, excludeCandidateId } = req.body;

  const result = await matchService.searchForDuplicate({
    template,
    excludeCandidateId: excludeCandidateId || null,
  });

  await matchService.logMatch({
    matchType: 'SEARCH_1_N',
    probeCandidateId: excludeCandidateId || null,
    matchedCandidateId: result.matchedCandidateId,
    matchScore: result.score,
    thresholdUsed: result.threshold,
    matched: result.matched,
    candidatesCompared: result.candidatesCompared,
    performedBy: req.user.id,
    ipAddress: auditLogModel.ipFromReq(req),
  });

  let matchedCandidate = null;
  if (result.matchedCandidateId) {
    const c = await candidateModel.findById(result.matchedCandidateId);
    matchedCandidate = c
      ? { id: c.id, candidateNumber: c.candidate_number, fullName: c.full_name, status: c.status }
      : null;
  }

  return ok(res, { ...result, matchedCandidate, matcherMode: matchService.matcherMode }, 'Search complete');
});

module.exports = { enroll, listForCandidate, verify, search };
