const { pool } = require('../db/pool');

async function record({ candidateId, oldStatus, newStatus, changedBy, remarks }, conn = pool) {
  await conn.query(
    `INSERT INTO application_status_history (candidate_id, old_status, new_status, changed_by, remarks)
     VALUES (?, ?, ?, ?, ?)`,
    [candidateId, oldStatus || null, newStatus, changedBy || null, remarks || null]
  );
}

async function listForCandidate(candidateId) {
  const [rows] = await pool.query(
    `SELECT h.*, u.name AS changed_by_name
     FROM application_status_history h
     LEFT JOIN users u ON u.id = h.changed_by
     WHERE h.candidate_id = ?
     ORDER BY h.created_at ASC`,
    [candidateId]
  );
  return rows;
}

module.exports = { record, listForCandidate };
