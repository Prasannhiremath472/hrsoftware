const { pool } = require('../db/pool');

async function findUserIdByPreAuthToken(preAuthToken) {
  if (!preAuthToken) return null;
  const [rows] = await pool.query(
    `SELECT user_id FROM login_otps
     WHERE pre_auth_token = ? AND consumed_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [preAuthToken]
  );
  return rows[0] ? rows[0].user_id : null;
}

module.exports = { findUserIdByPreAuthToken };
