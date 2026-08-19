const asyncHandler = require('../middleware/asyncHandler');
const { ok } = require('../utils/response');
const settingsService = require('../services/settingsService');
const auditLogModel = require('../models/auditLogModel');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getAll();
  return ok(res, settings, 'OK');
});

const putSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.setMany(req.body);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'UPDATE_SETTINGS',
    entityType: 'APPLICATION_SETTINGS',
    entityId: null,
    description: 'Application settings updated',
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, settings, 'Settings updated');
});

module.exports = { getSettings, putSettings };
