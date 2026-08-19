const { pool } = require('../db/pool');

/**
 * Runs a paginated SELECT alongside a COUNT(*) for the same WHERE clause.
 * When page/limit are omitted, returns the full row set unpaginated — used
 * by CSV export, which must always cover the complete filtered result.
 */
async function paginate({ selectSql, countSql, params, page, limit }) {
  if (!page && !limit) {
    const [rows] = await pool.query(selectSql, params);
    return rows;
  }
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  const offset = (pageNum - 1) * limitNum;
  const [rows] = await pool.query(`${selectSql} LIMIT ? OFFSET ?`, [...params, limitNum, offset]);
  const [countRows] = await pool.query(countSql, params);
  return { rows, total: countRows[0].total, page: pageNum, limit: limitNum };
}

async function candidatesReport({ dateFrom, dateTo, status, coordinatorId, page, limit } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom) {
    conditions.push('c.created_at >= ?');
    params.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    conditions.push('c.created_at <= ?');
    params.push(`${dateTo} 23:59:59`);
  }
  if (status) {
    conditions.push('c.status = ?');
    params.push(status);
  }
  if (coordinatorId) {
    conditions.push('c.coordinator_id = ?');
    params.push(coordinatorId);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return paginate({
    selectSql: `SELECT c.id, c.candidate_number, c.full_name, c.mobile, c.email, c.status, c.current_step,
            co.name AS coordinator_name, c.created_at, c.submitted_at
     FROM candidates c
     LEFT JOIN coordinators co ON co.id = c.coordinator_id
     ${whereClause}
     ORDER BY c.created_at DESC`,
    countSql: `SELECT COUNT(*) AS total FROM candidates c ${whereClause}`,
    params,
    page,
    limit,
  });
}

async function coordinatorsReport({ page, limit } = {}) {
  return paginate({
    selectSql: `SELECT co.id, co.name, co.mobile, co.email, co.status,
            COUNT(c.id) AS total_candidates,
            CAST(SUM(CASE WHEN c.status = 'COMPLETED' THEN 1 ELSE 0 END) AS UNSIGNED) AS completed_candidates
     FROM coordinators co
     LEFT JOIN candidates c ON c.coordinator_id = co.id
     GROUP BY co.id
     ORDER BY co.name ASC`,
    countSql: `SELECT COUNT(*) AS total FROM coordinators`,
    params: [],
    page,
    limit,
  });
}

async function statusReport({ page, limit } = {}) {
  return paginate({
    selectSql: `SELECT status, COUNT(*) AS total FROM candidates GROUP BY status ORDER BY total DESC`,
    countSql: `SELECT COUNT(DISTINCT status) AS total FROM candidates`,
    params: [],
    page,
    limit,
  });
}

async function biometricReport({ page, limit } = {}) {
  return paginate({
    selectSql: `SELECT c.candidate_number, c.full_name, b.hand, b.provider, b.quality_score, b.verification_status, b.captured_at
     FROM biometric_records b
     JOIN candidates c ON c.id = b.candidate_id
     ORDER BY b.captured_at DESC`,
    countSql: `SELECT COUNT(*) AS total FROM biometric_records`,
    params: [],
    page,
    limit,
  });
}

async function documentsReport({ page, limit } = {}) {
  return paginate({
    selectSql: `SELECT c.candidate_number, c.full_name, dt.name AS document_type, d.status, d.created_at, d.verified_at
     FROM candidate_documents d
     JOIN candidates c ON c.id = d.candidate_id
     JOIN document_types dt ON dt.id = d.document_type_id
     ORDER BY d.created_at DESC`,
    countSql: `SELECT COUNT(*) AS total FROM candidate_documents`,
    params: [],
    page,
    limit,
  });
}

async function monthlyRegistrations() {
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
     FROM candidates
     GROUP BY month
     ORDER BY month ASC`
  );
  return rows;
}

module.exports = { candidatesReport, coordinatorsReport, statusReport, biometricReport, documentsReport, monthlyRegistrations };
