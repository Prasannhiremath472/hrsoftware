const { pool } = require('../db/pool');

/**
 * Records a sensitive action into audit_logs. Accepts an optional
 * connection (for use inside a transaction) or falls back to the pool.
 */
async function record({ userId, action, entityType, entityId, description, ipAddress, userAgent }, conn = pool) {
  await conn.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, action, entityType, entityId != null ? String(entityId) : null, description || null, ipAddress || null, userAgent || null]
  );
}

async function list({ page = 1, limit = 20, userId, action, dateFrom, dateTo }) {
  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push('a.user_id = ?');
    params.push(userId);
  }
  if (action) {
    conditions.push('a.action = ?');
    params.push(action);
  }
  if (dateFrom) {
    conditions.push('a.created_at >= ?');
    params.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    conditions.push('a.created_at <= ?');
    params.push(`${dateTo} 23:59:59`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const [rows] = await pool.query(
    `SELECT a.*, u.name AS user_name, u.email AS user_email
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs a ${whereClause}`,
    params
  );

  return { rows, total: countRows[0].total };
}

function ipFromReq(req) {
  return (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();
}

module.exports = { record, list, ipFromReq };
