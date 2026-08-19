const asyncHandler = require('../middleware/asyncHandler');
const { ok, created } = require('../utils/response');
const documentTypeModel = require('../models/documentTypeModel');
const auditLogModel = require('../models/auditLogModel');

const list = asyncHandler(async (req, res) => {
  const activeOnly = req.query.activeOnly === 'true';
  const result = await documentTypeModel.list({ activeOnly, page: req.query.page, limit: req.query.limit });
  return ok(res, result, 'OK');
});

const create = asyncHandler(async (req, res) => {
  const type = await documentTypeModel.create(req.body);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'CREATE_DOCUMENT_TYPE',
    entityType: 'DOCUMENT_TYPE',
    entityId: type.id,
    description: `Created document type ${type.name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return created(res, type, 'Document type created');
});

const update = asyncHandler(async (req, res) => {
  const type = await documentTypeModel.update(req.params.id, req.body);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'UPDATE_DOCUMENT_TYPE',
    entityType: 'DOCUMENT_TYPE',
    entityId: req.params.id,
    description: `Updated document type ${type.name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, type, 'Document type updated');
});

module.exports = { list, create, update };
