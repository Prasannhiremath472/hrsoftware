const { pool } = require('../db/pool');

async function create({ candidateId, documentTypeId, storedFilename, originalFilename, mimeType, fileSizeBytes, storagePath, uploadedBy }) {
  const [result] = await pool.query(
    `INSERT INTO candidate_documents
     (candidate_id, document_type_id, stored_filename, original_filename, mime_type, file_size_bytes, storage_path, status, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'UPLOADED', ?)`,
    [candidateId, documentTypeId, storedFilename, originalFilename, mimeType, fileSizeBytes, storagePath, uploadedBy || null]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT d.*, dt.name AS document_type_name, dt.code AS document_type_code, dt.is_mandatory
     FROM candidate_documents d
     JOIN document_types dt ON dt.id = d.document_type_id
     WHERE d.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function listForCandidate(candidateId) {
  const [rows] = await pool.query(
    `SELECT d.*, dt.name AS document_type_name, dt.code AS document_type_code, dt.is_mandatory
     FROM candidate_documents d
     JOIN document_types dt ON dt.id = d.document_type_id
     WHERE d.candidate_id = ?
     ORDER BY d.created_at DESC`,
    [candidateId]
  );
  return rows;
}

async function replaceFile(id, { storedFilename, originalFilename, mimeType, fileSizeBytes, storagePath, uploadedBy }) {
  await pool.query(
    `UPDATE candidate_documents
     SET stored_filename = ?, original_filename = ?, mime_type = ?, file_size_bytes = ?, storage_path = ?,
         status = 'UPLOADED', reject_reason = NULL, reject_comment = NULL, verified_by = NULL, verified_at = NULL, uploaded_by = ?
     WHERE id = ?`,
    [storedFilename, originalFilename, mimeType, fileSizeBytes, storagePath, uploadedBy || null, id]
  );
  return findById(id);
}

async function setVerified(id, verifiedBy) {
  await pool.query(
    `UPDATE candidate_documents SET status = 'VERIFIED', verified_by = ?, verified_at = NOW(), reject_reason = NULL, reject_comment = NULL WHERE id = ?`,
    [verifiedBy, id]
  );
  return findById(id);
}

async function setRejected(id, verifiedBy, reason, comment) {
  await pool.query(
    `UPDATE candidate_documents SET status = 'REJECTED', verified_by = ?, verified_at = NOW(), reject_reason = ?, reject_comment = ? WHERE id = ?`,
    [verifiedBy, reason, comment || null, id]
  );
  return findById(id);
}

module.exports = { create, findById, listForCandidate, replaceFile, setVerified, setRejected };
