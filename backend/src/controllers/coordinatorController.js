const asyncHandler = require('../middleware/asyncHandler');
const { ok, created, fail } = require('../utils/response');
const coordinatorModel = require('../models/coordinatorModel');
const auditLogModel = require('../models/auditLogModel');

const create = asyncHandler(async (req, res) => {
  const coordinator = await coordinatorModel.create(req.body);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'CREATE_COORDINATOR',
    entityType: 'COORDINATOR',
    entityId: coordinator.id,
    description: `Created coordinator ${coordinator.name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return created(res, coordinator, 'Coordinator created');
});

const list = asyncHandler(async (req, res) => {
  const result = await coordinatorModel.list({
    status: req.query.status,
    search: req.query.search,
    page: req.query.page,
    limit: req.query.limit,
  });
  return ok(res, result, 'OK');
});

const getOne = asyncHandler(async (req, res) => {
  const coordinator = await coordinatorModel.findById(req.params.id);
  if (!coordinator) return fail(res, 'Coordinator not found', 404);
  return ok(res, coordinator, 'OK');
});

const update = asyncHandler(async (req, res) => {
  const existing = await coordinatorModel.findById(req.params.id);
  if (!existing) return fail(res, 'Coordinator not found', 404);
  const coordinator = await coordinatorModel.update(req.params.id, req.body);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'UPDATE_COORDINATOR',
    entityType: 'COORDINATOR',
    entityId: coordinator.id,
    description: `Updated coordinator ${coordinator.name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, coordinator, 'Coordinator updated');
});

const updateStatus = asyncHandler(async (req, res) => {
  const existing = await coordinatorModel.findById(req.params.id);
  if (!existing) return fail(res, 'Coordinator not found', 404);
  const coordinator = await coordinatorModel.updateStatus(req.params.id, req.body.status);
  await auditLogModel.record({
    userId: req.user.id,
    action: existing.status !== req.body.status ? 'DEACTIVATE_OR_ACTIVATE_COORDINATOR' : 'UPDATE_COORDINATOR_STATUS',
    entityType: 'COORDINATOR',
    entityId: coordinator.id,
    description: `Coordinator ${coordinator.name} status set to ${req.body.status}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, coordinator, 'Coordinator status updated');
});

module.exports = { create, list, getOne, update, updateStatus };
