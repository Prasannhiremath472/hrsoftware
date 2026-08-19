const { pool } = require('../db/pool');

async function findByCandidateId(candidateId) {
  const [rows] = await pool.query('SELECT * FROM candidate_signatures WHERE candidate_id = ? LIMIT 1', [candidateId]);
  return rows[0] || null;
}

async function upsert(candidateId, { storedFilename, storagePath }) {
  const existing = await findByCandidateId(candidateId);
  if (existing) {
    await pool.query(
      `UPDATE candidate_signatures SET stored_filename = ?, storage_path = ?, signed_at = NOW() WHERE candidate_id = ?`,
      [storedFilename, storagePath, candidateId]
    );
  } else {
    await pool.query(
      `INSERT INTO candidate_signatures (candidate_id, stored_filename, storage_path) VALUES (?, ?, ?)`,
      [candidateId, storedFilename, storagePath]
    );
  }
  return findByCandidateId(candidateId);
}

module.exports = { findByCandidateId, upsert };
