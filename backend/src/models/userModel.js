const { pool } = require('../db/pool');

async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, role, is_active, last_login_at, created_at FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function updateLastLogin(id) {
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
}

async function upsertAdmin({ name, email, passwordHash }) {
  const existing = await findByEmail(email);
  if (existing) {
    await pool.query('UPDATE users SET name = ?, password_hash = ?, role = ?, is_active = 1 WHERE id = ?', [
      name,
      passwordHash,
      'SUPER_ADMIN',
      existing.id,
    ]);
    return existing.id;
  }
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
    [name, email, passwordHash, 'SUPER_ADMIN']
  );
  return result.insertId;
}

module.exports = { findByEmail, findById, updateLastLogin, upsertAdmin };
