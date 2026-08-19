const { pool } = require('../db/pool');

async function findByCandidateId(candidateId) {
  const [rows] = await pool.query('SELECT * FROM candidate_declarations WHERE candidate_id = ? LIMIT 1', [candidateId]);
  return rows[0] || null;
}

async function upsert(candidateId, { accepted, ipAddress }) {
  const existing = await findByCandidateId(candidateId);
  if (existing) {
    await pool.query(
      `UPDATE candidate_declarations SET accepted = ?, accepted_at = ?, ip_address = ? WHERE candidate_id = ?`,
      [accepted ? 1 : 0, accepted ? new Date() : null, ipAddress || null, candidateId]
    );
  } else {
    await pool.query(
      `INSERT INTO candidate_declarations (candidate_id, accepted, accepted_at, ip_address) VALUES (?, ?, ?, ?)`,
      [candidateId, accepted ? 1 : 0, accepted ? new Date() : null, ipAddress || null]
    );
  }
  return findByCandidateId(candidateId);
}

module.exports = { findByCandidateId, upsert };
