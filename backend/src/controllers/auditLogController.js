const asyncHandler = require('../middleware/asyncHandler');
const { ok } = require('../utils/response');
const auditLogModel = require('../models/auditLogModel');

const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, userId, action, dateFrom, dateTo } = req.query;
  const result = await auditLogModel.list({ page, limit, userId, action, dateFrom, dateTo });
  return ok(res, { rows: result.rows, total: result.total, page: Number(page), limit: Number(limit) }, 'OK');
});

module.exports = { list };
