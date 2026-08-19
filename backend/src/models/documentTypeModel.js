const { pool } = require('../db/pool');

async function list({ activeOnly = false, page, limit } = {}) {
  const whereClause = activeOnly ? 'WHERE is_active = 1' : '';

  // Pagination is opt-in: the onboarding wizard's document checklist/upload
  // steps need the full active list in one call and never pass page/limit.
  if (!page && !limit) {
    const [rows] = await pool.query(
      `SELECT * FROM document_types ${whereClause} ORDER BY display_order ASC, name ASC`
    );
    return rows;
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const offset = (pageNum - 1) * limitNum;

  const [rows] = await pool.query(
    `SELECT * FROM document_types ${whereClause} ORDER BY display_order ASC, name ASC LIMIT ? OFFSET ?`,
    [limitNum, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM document_types ${whereClause}`);

  return { rows, total: countRows[0].total, page: pageNum, limit: limitNum };
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM document_types WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function create({ name, code, isMandatory, displayOrder }) {
  const [result] = await pool.query(
    `INSERT INTO document_types (name, code, is_mandatory, display_order) VALUES (?, ?, ?, ?)`,
    [name, code, isMandatory ? 1 : 0, displayOrder || 0]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const allowed = ['name', 'code', 'is_mandatory', 'is_active', 'display_order'];
  const map = { isMandatory: 'is_mandatory', isActive: 'is_active', displayOrder: 'display_order' };
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = map[key] || key;
    if (allowed.includes(column)) {
      sets.push(`${column} = ?`);
      params.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
    }
  }
  if (!sets.length) return findById(id);
  params.push(id);
  await pool.query(`UPDATE document_types SET ${sets.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

module.exports = { list, findById, create, update };
