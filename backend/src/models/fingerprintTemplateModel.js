const { pool } = require('../db/pool');

/**
 * Fingerprint template storage.
 *
 * SECURITY: the `template` column holds actual biometric data. It must never
 * be returned by any API response — every read helper here that feeds a
 * controller deliberately omits it. Only the matching service reads templates,
 * and only to compare them.
 */

/** Columns safe to expose via the API — never includes `template`. */
const SAFE_COLUMNS = `id, candidate_id, finger, template_format, quality_score,
  device_serial, device_model, sdk_version, captured_by, captured_at, created_at`;

async function upsert(candidateId, { finger, template, templateFormat, qualityScore, deviceSerial, deviceModel, sdkVersion, capturedBy }) {
  const [existing] = await pool.query(
    'SELECT id FROM fingerprint_templates WHERE candidate_id = ? AND finger = ? LIMIT 1',
    [candidateId, finger]
  );

  if (existing[0]) {
    await pool.query(
      `UPDATE fingerprint_templates
       SET template = ?, template_format = ?, quality_score = ?, device_serial = ?,
           device_model = ?, sdk_version = ?, captured_by = ?, captured_at = NOW()
       WHERE id = ?`,
      [
        template,
        templateFormat || 'ISO_19794_2',
        qualityScore,
        deviceSerial || null,
        deviceModel || null,
        sdkVersion || null,
        capturedBy || null,
        existing[0].id,
      ]
    );
    return findById(existing[0].id);
  }

  const [result] = await pool.query(
    `INSERT INTO fingerprint_templates
     (candidate_id, finger, template, template_format, quality_score, device_serial, device_model, sdk_version, captured_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      candidateId,
      finger,
      template,
      templateFormat || 'ISO_19794_2',
      qualityScore,
      deviceSerial || null,
      deviceModel || null,
      sdkVersion || null,
      capturedBy || null,
    ]
  );
  return findById(result.insertId);
}

/** Returns metadata only — never the template itself. */
async function findById(id) {
  const [rows] = await pool.query(`SELECT ${SAFE_COLUMNS} FROM fingerprint_templates WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

/** Returns metadata only — never the template itself. */
async function listForCandidate(candidateId) {
  const [rows] = await pool.query(
    `SELECT ${SAFE_COLUMNS} FROM fingerprint_templates WHERE candidate_id = ? ORDER BY finger ASC`,
    [candidateId]
  );
  return rows;
}

async function deleteForCandidate(candidateId) {
  await pool.query('DELETE FROM fingerprint_templates WHERE candidate_id = ?', [candidateId]);
}

async function countAll() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM fingerprint_templates');
  return rows[0].total;
}

module.exports = { upsert, findById, listForCandidate, deleteForCandidate, countAll };
