const { pool } = require('../db/pool');

async function findByCandidateId(candidateId) {
  const [rows] = await pool.query('SELECT * FROM candidate_original_verification WHERE candidate_id = ? LIMIT 1', [candidateId]);
  return rows[0] || null;
}

async function upsert(candidateId, { originalsVerified, selfAttestedReceived, verifiedBy }) {
  const existing = await findByCandidateId(candidateId);
  if (existing) {
    await pool.query(
      `UPDATE candidate_original_verification
       SET originals_verified = ?, self_attested_received = ?, verified_by = ?, verified_at = NOW()
       WHERE candidate_id = ?`,
      [originalsVerified ? 1 : 0, selfAttestedReceived ? 1 : 0, verifiedBy, candidateId]
    );
  } else {
    await pool.query(
      `INSERT INTO candidate_original_verification (candidate_id, originals_verified, self_attested_received, verified_by, verified_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [candidateId, originalsVerified ? 1 : 0, selfAttestedReceived ? 1 : 0, verifiedBy]
    );
  }
  return findByCandidateId(candidateId);
}

module.exports = { findByCandidateId, upsert };
