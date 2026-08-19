const { pool } = require('../db/pool');

async function upsert(candidateId, { hand, provider, captureReference, qualityScore, deviceInfo, capturedBy }) {
  const [existingRows] = await pool.query(
    'SELECT id FROM biometric_records WHERE candidate_id = ? AND hand = ? LIMIT 1',
    [candidateId, hand]
  );

  if (existingRows[0]) {
    await pool.query(
      `UPDATE biometric_records
       SET provider = ?, capture_reference = ?, quality_score = ?, device_info = ?, verification_status = 'CAPTURED', captured_by = ?, captured_at = NOW()
       WHERE id = ?`,
      [provider, captureReference, qualityScore, deviceInfo || null, capturedBy || null, existingRows[0].id]
    );
    return findById(existingRows[0].id);
  }

  const [result] = await pool.query(
    `INSERT INTO biometric_records (candidate_id, hand, provider, capture_reference, quality_score, device_info, verification_status, captured_by)
     VALUES (?, ?, ?, ?, ?, ?, 'CAPTURED', ?)`,
    [candidateId, hand, provider, captureReference, qualityScore, deviceInfo || null, capturedBy || null]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM biometric_records WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function listForCandidate(candidateId) {
  const [rows] = await pool.query('SELECT * FROM biometric_records WHERE candidate_id = ? ORDER BY hand ASC', [candidateId]);
  return rows;
}

async function setVerified(candidateId, hand) {
  await pool.query(
    `UPDATE biometric_records SET verification_status = 'VERIFIED' WHERE candidate_id = ? AND hand = ?`,
    [candidateId, hand]
  );
  const [rows] = await pool.query('SELECT * FROM biometric_records WHERE candidate_id = ? AND hand = ?', [candidateId, hand]);
  return rows[0] || null;
}

module.exports = { upsert, findById, listForCandidate, setVerified };
