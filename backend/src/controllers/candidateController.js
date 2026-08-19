const asyncHandler = require('../middleware/asyncHandler');
const { ok, created, fail } = require('../utils/response');
const candidateModel = require('../models/candidateModel');
const coordinatorModel = require('../models/coordinatorModel');
const auditLogModel = require('../models/auditLogModel');
const statusHistoryModel = require('../models/statusHistoryModel');
const submitValidationService = require('../services/submitValidationService');
const { pool, withTransaction } = require('../db/pool');

const create = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.create({ ...req.body, createdBy: req.user.id });
  await auditLogModel.record({
    userId: req.user.id,
    action: 'CREATE_CANDIDATE',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Registered candidate ${candidate.full_name} (${candidate.candidate_number})`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return created(res, candidate, 'Candidate registered');
});

const list = asyncHandler(async (req, res) => {
  const result = await candidateModel.list(req.query);
  return ok(res, result, 'OK');
});

const getOne = asyncHandler(async (req, res) => {
  const candidate = await candidateModel.findById(req.params.id);
  if (!candidate) return fail(res, 'Candidate not found', 404);
  return ok(res, candidate, 'OK');
});

const update = asyncHandler(async (req, res) => {
  const existing = await candidateModel.findById(req.params.id);
  if (!existing) return fail(res, 'Candidate not found', 404);
  const candidate = await candidateModel.update(req.params.id, req.body);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'UPDATE_CANDIDATE',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Updated candidate ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, candidate, 'Candidate updated');
});

const assignCoordinator = asyncHandler(async (req, res) => {
  const existing = await candidateModel.findById(req.params.id);
  if (!existing) return fail(res, 'Candidate not found', 404);

  const coordinator = await coordinatorModel.findById(req.body.coordinatorId);
  if (!coordinator) return fail(res, 'Coordinator not found', 404);
  if (coordinator.status !== 'ACTIVE') return fail(res, 'Only active coordinators can be assigned', 400);

  const candidate = await candidateModel.updateCoordinator(req.params.id, req.body.coordinatorId);
  await auditLogModel.record({
    userId: req.user.id,
    action: 'ASSIGN_COORDINATOR',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Assigned coordinator ${coordinator.name} to candidate ${candidate.full_name}`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });
  return ok(res, candidate, 'Coordinator assigned');
});

const submit = asyncHandler(async (req, res) => {
  const existing = await candidateModel.findById(req.params.id);
  if (!existing) return fail(res, 'Candidate not found', 404);
  if (existing.status === 'COMPLETED') return fail(res, 'Application already submitted', 400);

  const validation = await submitValidationService.validateForSubmit(req.params.id);
  if (!validation.valid) {
    return fail(res, 'Application is incomplete and cannot be submitted', 422, validation.errors.map((e) => ({ message: e })));
  }

  const candidate = await withTransaction(async (conn) => {
    await conn.query('UPDATE candidates SET status = ?, current_step = ?, submitted_at = NOW() WHERE id = ?', [
      'COMPLETED',
      'SUBMITTED',
      req.params.id,
    ]);
    await statusHistoryModel.record(
      { candidateId: req.params.id, oldStatus: existing.status, newStatus: 'COMPLETED', changedBy: req.user.id, remarks: 'Application submitted' },
      conn
    );
    const [rows] = await conn.query('SELECT * FROM candidates WHERE id = ?', [req.params.id]);
    return rows[0];
  });

  await auditLogModel.record({
    userId: req.user.id,
    action: 'SUBMIT_APPLICATION',
    entityType: 'CANDIDATE',
    entityId: candidate.id,
    description: `Submitted application for ${candidate.full_name} (${candidate.candidate_number})`,
    ipAddress: auditLogModel.ipFromReq(req),
    userAgent: req.headers['user-agent'],
  });

  return ok(res, candidate, 'Application submitted successfully');
});

const statusHistory = asyncHandler(async (req, res) => {
  const rows = await statusHistoryModel.listForCandidate(req.params.id);
  return ok(res, rows, 'OK');
});

module.exports = { create, list, getOne, update, assignCoordinator, submit, statusHistory };
