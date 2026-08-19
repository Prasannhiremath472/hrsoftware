const asyncHandler = require('../middleware/asyncHandler');
const { ok, fail } = require('../utils/response');
const candidateModel = require('../models/candidateModel');
const documentTypeModel = require('../models/documentTypeModel');
const selectionModel = require('../models/documentSelectionModel');
const auditLogModel = require('../models/auditLogModel');
const { markStepComplete } = require('../services/wizardProgressService');

const getSelection = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  return ok(res, await selectionModel.listForCandidate(req.params.id), 'OK');
});

const putSelection = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  const { documentTypeIds } = req.body;

  // Confirm every id is a real, active document type rather than trusting
  // the client-supplied list outright.
  const allTypes = await documentTypeModel.list({ activeOnly: true });
  const validIds = new Set(allTypes.map((t) => t.id));
  const invalid = documentTypeIds.filter((id) => !validIds.has(id));
  if (invalid.length) {
    return fail(res, `Invalid document type id(s): ${invalid.join(', ')}`, 422);
  }

  // Mandatory types are always required regardless of what the client sent.
  const mandatoryIds = allTypes.filter((t) => t.is_mandatory).map((t) => t.id);
  const finalIds = Array.from(new Set([...documentTypeIds, ...mandatoryIds]));

  await selectionModel.replaceSelection(candidate.id, finalIds);

  if (finalIds.length > 0) {
    await markStepComplete(candidate, 'DOCUMENT_CHECKLIST', req.user.id, 'Document checklist selected');
  }

  await auditLogModel.record({
    userId: req.user.id,
    action: 'UPDATE_DOCUMENT_CHECKLIST',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Document checklist updated for ${candidate.full_name} (${finalIds.length} type(s) selected)`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, finalIds, 'Document checklist saved');
});

module.exports = { getSelection, putSelection };
