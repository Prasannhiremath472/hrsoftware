/**
 * Safely generates the next candidate_number in format CAN-YYYY-NNNNNN.
 * Must be called with an active transaction connection so the SELECT...FOR UPDATE
 * lock is held for the duration of the transaction, preventing duplicate numbers
 * under concurrent requests.
 */
async function generateCandidateNumber(conn, prefix = 'CAN') {
  const year = new Date().getFullYear();
  const counterKey = `candidate_number_${year}`;

  await conn.query(
    `INSERT INTO counters (counter_key, current_value) VALUES (?, 0)
     ON DUPLICATE KEY UPDATE counter_key = counter_key`,
    [counterKey]
  );

  const [rows] = await conn.query(
    `SELECT current_value FROM counters WHERE counter_key = ? FOR UPDATE`,
    [counterKey]
  );
  const nextValue = Number(rows[0].current_value) + 1;

  await conn.query(`UPDATE counters SET current_value = ? WHERE counter_key = ?`, [nextValue, counterKey]);

  const padded = String(nextValue).padStart(6, '0');
  return `${prefix}-${year}-${padded}`;
}

module.exports = { generateCandidateNumber };
