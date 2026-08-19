const { pool, withTransaction } = require('../db/pool');
const { generateCandidateNumber } = require('../services/candidateNumberService');
const settingsService = require('../services/settingsService');
const statusHistoryModel = require('./statusHistoryModel');

async function create({ fullName, mobile, email, dob, gender, coordinatorId, createdBy }) {
  return withTransaction(async (conn) => {
    const prefix = await settingsService.getOne('candidate_number_prefix');
    const candidateNumber = await generateCandidateNumber(conn, prefix || 'CAN');

    const [result] = await conn.query(
      `INSERT INTO candidates (candidate_number, full_name, mobile, email, dob, gender, coordinator_id, status, current_step, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', 'REGISTRATION', ?)`,
      [candidateNumber, fullName, mobile, email || null, dob || null, gender || null, coordinatorId || null, createdBy || null]
    );

    await statusHistoryModel.record(
      { candidateId: result.insertId, oldStatus: null, newStatus: 'DRAFT', changedBy: createdBy, remarks: 'Candidate registered' },
      conn
    );

    const [rows] = await conn.query('SELECT * FROM candidates WHERE id = ?', [result.insertId]);
    return rows[0];
  });
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT c.*, co.name AS coordinator_name, co.status AS coordinator_status
     FROM candidates c
     LEFT JOIN coordinators co ON co.id = c.coordinator_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function list({ page = 1, limit = 20, search, coordinatorId, status, dateFrom, dateTo }) {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push('(c.full_name LIKE ? OR c.mobile LIKE ? OR c.email LIKE ? OR c.candidate_number LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (coordinatorId) {
    conditions.push('c.coordinator_id = ?');
    params.push(coordinatorId);
  }
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }
  if (dateFrom) {
    conditions.push('c.created_at >= ?');
    params.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    conditions.push('c.created_at <= ?');
    params.push(`${dateTo} 23:59:59`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const [rows] = await pool.query(
    `SELECT c.*, co.name AS coordinator_name
     FROM candidates c
     LEFT JOIN coordinators co ON co.id = c.coordinator_id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM candidates c ${whereClause}`, params);

  return { rows, total: countRows[0].total, page: Number(page), limit: Number(limit) };
}

async function update(id, fields) {
  const allowed = ['full_name', 'mobile', 'email', 'dob', 'gender'];
  const map = { fullName: 'full_name' };
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = map[key] || key;
    if (allowed.includes(column)) {
      sets.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (!sets.length) return findById(id);
  params.push(id);
  await pool.query(`UPDATE candidates SET ${sets.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function updateCoordinator(id, coordinatorId) {
  await pool.query('UPDATE candidates SET coordinator_id = ? WHERE id = ?', [coordinatorId, id]);
  return findById(id);
}

async function updateStep(id, step, conn = pool) {
  await conn.query('UPDATE candidates SET current_step = ? WHERE id = ?', [step, id]);
}

async function updateStatus(id, newStatus, changedBy, remarks, conn = pool) {
  const [rows] = await conn.query('SELECT status FROM candidates WHERE id = ?', [id]);
  const oldStatus = rows[0] ? rows[0].status : null;
  await conn.query('UPDATE candidates SET status = ? WHERE id = ?', [newStatus, id]);
  await statusHistoryModel.record({ candidateId: id, oldStatus, newStatus, changedBy, remarks }, conn);
  return findById(id);
}

module.exports = { create, findById, list, update, updateCoordinator, updateStep, updateStatus };
