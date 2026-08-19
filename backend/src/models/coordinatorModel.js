const { pool } = require('../db/pool');

async function create({ name, mobile, email, employeeCode, location, status }) {
  const [result] = await pool.query(
    `INSERT INTO coordinators (name, mobile, email, employee_code, location, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, mobile, email || null, employeeCode || null, location || null, status || 'ACTIVE']
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM candidates ca WHERE ca.coordinator_id = c.id) AS candidate_count
     FROM coordinators c WHERE c.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function list({ status, search, page, limit } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(c.name LIKE ? OR c.mobile LIKE ? OR c.email LIKE ? OR c.employee_code LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  // Pagination is opt-in: omitting page/limit returns the full list, which
  // callers like the coordinator-assignment dropdown rely on.
  if (!page && !limit) {
    const [rows] = await pool.query(
      `SELECT c.*, (SELECT COUNT(*) FROM candidates ca WHERE ca.coordinator_id = c.id) AS candidate_count
       FROM coordinators c
       ${whereClause}
       ORDER BY c.created_at DESC`,
      params
    );
    return rows;
  }

  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const offset = (pageNum - 1) * limitNum;

  const [rows] = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM candidates ca WHERE ca.coordinator_id = c.id) AS candidate_count
     FROM coordinators c
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM coordinators c ${whereClause}`, params);

  return { rows, total: countRows[0].total, page: pageNum, limit: limitNum };
}

async function update(id, fields) {
  const allowed = ['name', 'mobile', 'email', 'employee_code', 'location'];
  const map = { employeeCode: 'employee_code' };
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    const column = map[key] || key;
    if (allowed.includes(column)) {
      sets.push(`${column} = ?`);
      params.push(value);
    }
  }
  if (!sets.length) return findById(id);
  params.push(id);
  await pool.query(`UPDATE coordinators SET ${sets.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function updateStatus(id, status) {
  await pool.query('UPDATE coordinators SET status = ? WHERE id = ?', [status, id]);
  return findById(id);
}

module.exports = { create, findById, list, update, updateStatus };
