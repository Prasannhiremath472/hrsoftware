const { pool } = require('../db/pool');

/**
 * Persists which document types a candidate needs to submit (the Document
 * Checklist step). Separate from candidate_documents, which tracks actual
 * uploaded files — a type can be selected here before anything is uploaded.
 */

async function replaceSelection(candidateId, documentTypeIds) {
  await pool.query('DELETE FROM candidate_document_selection WHERE candidate_id = ?', [candidateId]);
  if (!documentTypeIds.length) return;

  const values = documentTypeIds.map((typeId) => [candidateId, typeId]);
  await pool.query('INSERT INTO candidate_document_selection (candidate_id, document_type_id) VALUES ?', [values]);
}

async function listForCandidate(candidateId) {
  const [rows] = await pool.query(
    'SELECT document_type_id FROM candidate_document_selection WHERE candidate_id = ?',
    [candidateId]
  );
  return rows.map((r) => r.document_type_id);
}

module.exports = { replaceSelection, listForCandidate };
