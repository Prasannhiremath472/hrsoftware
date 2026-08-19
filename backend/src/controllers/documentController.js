const path = require('path');
const asyncHandler = require('../middleware/asyncHandler');
const { ok, created, fail } = require('../utils/response');
const documentModel = require('../models/documentModel');
const documentTypeModel = require('../models/documentTypeModel');
const candidateModel = require('../models/candidateModel');
const auditLogModel = require('../models/auditLogModel');
const storageService = require('../services/storageService');
const { markStepComplete } = require('../services/wizardProgressService');

const upload = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);

  if (!req.file) return fail(res, 'A file is required', 400);
  const documentTypeId = Number(req.body.documentTypeId);
  if (!documentTypeId) return fail(res, 'documentTypeId is required', 400);

  const docType = await documentTypeModel.findById(documentTypeId);
  if (!docType || !docType.is_active) return fail(res, 'Invalid document type', 400);

  const ext = path.extname(req.file.originalname).toLowerCase();
  const { storedFilename, storagePath } = await storageService.saveBuffer({
    category: 'documents',
    candidateId: candidate.id,
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalExt: ext,
  });

  const document = await documentModel.create({
    candidateId: candidate.id,
    documentTypeId,
    storedFilename,
    originalFilename: req.file.originalname,
    mimeType: req.file.mimetype,
    fileSizeBytes: req.file.size,
    storagePath,
    uploadedBy: req.user.id,
  });

  // Checklist selection lives in the wizard's frontend state and is never
  // persisted separately, so the first document actually landing in storage
  // is the signal that both the checklist and upload steps are underway.
  await markStepComplete(candidate, 'DOCUMENT_CHECKLIST', req.user.id, 'Document checklist selected');
  await markStepComplete(candidate, 'DOCUMENT_UPLOAD', req.user.id, 'Document uploaded');

  await auditLogModel.record({
    userId: req.user.id,
    action: 'UPLOAD_DOCUMENT',
    entityType: 'CANDIDATE_DOCUMENT',
    entityId: document.id,
    description: `Uploaded ${docType.name} for candidate ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return created(res, document, 'Document uploaded');
});

const listForCandidate = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  const documents = await documentModel.listForCandidate(req.params.id);
  return ok(res, documents, 'OK');
});

const view = asyncHandler(async (req, res) => {
  const document = await documentModel.findById(req.params.id);
  if (!document) return fail(res, 'Document not found', 404);

  const absolutePath = storageService.resolveAbsolutePath(document.storage_path);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'VIEW_DOCUMENT',
    entityType: 'CANDIDATE_DOCUMENT',
    entityId: document.id,
    description: `Viewed document ${document.document_type_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  res.setHeader('Content-Type', document.mime_type);
  res.setHeader('Content-Disposition', 'inline');
  return res.sendFile(absolutePath);
});

const download = asyncHandler(async (req, res) => {
  const document = await documentModel.findById(req.params.id);
  if (!document) return fail(res, 'Document not found', 404);

  const absolutePath = storageService.resolveAbsolutePath(document.storage_path);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'DOWNLOAD_DOCUMENT',
    entityType: 'CANDIDATE_DOCUMENT',
    entityId: document.id,
    description: `Downloaded document ${document.document_type_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return res.download(absolutePath, document.original_filename);
});

// A candidate's documents are considered "resolved" once none remain in the
// initial UPLOADED (awaiting review) state — matches submitValidationService's
// own definition of what blocks final submission.
async function markVerificationStepIfResolved(candidateId, userId) {
  const candidate = await candidateModel.findById(candidateId);
  const documents = await documentModel.listForCandidate(candidateId);
  const stillPending = documents.some((d) => d.status === 'UPLOADED');
  if (documents.length && !stillPending) {
    await markStepComplete(candidate, 'VERIFICATION', userId, 'All documents resolved');
  }
}

const verify = asyncHandler(async (req, res) => {
  const document = await documentModel.findById(req.params.id);
  if (!document) return fail(res, 'Document not found', 404);
  const updated = await documentModel.setVerified(req.params.id, req.user.id);
  await markVerificationStepIfResolved(document.candidate_id, req.user.id);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'VERIFY_DOCUMENT',
    entityType: 'CANDIDATE_DOCUMENT',
    entityId: document.id,
    description: `Verified document ${document.document_type_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, updated, 'Document verified');
});

const reject = asyncHandler(async (req, res) => {
  const document = await documentModel.findById(req.params.id);
  if (!document) return fail(res, 'Document not found', 404);
  const { reason, comment } = req.body;
  const updated = await documentModel.setRejected(req.params.id, req.user.id, reason, comment);
  await markVerificationStepIfResolved(document.candidate_id, req.user.id);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'REJECT_DOCUMENT',
    entityType: 'CANDIDATE_DOCUMENT',
    entityId: document.id,
    description: `Rejected document ${document.document_type_name}: ${reason}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, updated, 'Document rejected');
});

module.exports = { upload, listForCandidate, view, download, verify, reject };
