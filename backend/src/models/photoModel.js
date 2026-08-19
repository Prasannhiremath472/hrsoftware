const { pool } = require('../db/pool');

async function findByCandidateId(candidateId) {
  const [rows] = await pool.query('SELECT * FROM candidate_photos WHERE candidate_id = ? LIMIT 1', [candidateId]);
  return rows[0] || null;
}

async function upsert(candidateId, { storedFilename, storagePath, mimeType, capturedBy }) {
  const existing = await findByCandidateId(candidateId);
  if (existing) {
    await pool.query(
      `UPDATE candidate_photos SET stored_filename = ?, storage_path = ?, mime_type = ?, captured_at = NOW(), captured_by = ? WHERE candidate_id = ?`,
      [storedFilename, storagePath, mimeType, capturedBy || null, candidateId]
    );
  } else {
    await pool.query(
      `INSERT INTO candidate_photos (candidate_id, stored_filename, storage_path, mime_type, captured_by) VALUES (?, ?, ?, ?, ?)`,
      [candidateId, storedFilename, storagePath, mimeType, capturedBy || null]
    );
  }
  return findByCandidateId(candidateId);
}

module.exports = { findByCandidateId, upsert };
