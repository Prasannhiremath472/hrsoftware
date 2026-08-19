const { pool } = require('../db/pool');

async function findByCandidateId(candidateId) {
  const [rows] = await pool.query('SELECT * FROM candidate_kyc WHERE candidate_id = ? LIMIT 1', [candidateId]);
  return rows[0] || null;
}

async function upsert(candidateId, fields) {
  const existing = await findByCandidateId(candidateId);
  const columns = [
    'applicant_name', 'father_spouse_name', 'gender', 'marital_status', 'dob', 'nationality',
    'residency_status', 'pan_number', 'aadhaar_number', 'proof_of_identity',
  ];
  const map = {
    applicantName: 'applicant_name',
    fatherSpouseName: 'father_spouse_name',
    maritalStatus: 'marital_status',
    residencyStatus: 'residency_status',
    panNumber: 'pan_number',
    aadhaarNumber: 'aadhaar_number',
    proofOfIdentity: 'proof_of_identity',
  };

  const data = {};
  for (const [key, value] of Object.entries(fields)) {
    const column = map[key] || key;
    if (columns.includes(column)) data[column] = value;
  }

  const isCompleted = Boolean(
    (data.applicant_name || existing?.applicant_name) &&
    (data.dob || existing?.dob) &&
    (data.pan_number || existing?.pan_number) &&
    (data.aadhaar_number || existing?.aadhaar_number) &&
    (data.proof_of_identity || existing?.proof_of_identity)
  );

  if (existing) {
    const sets = Object.keys(data).map((c) => `${c} = ?`);
    sets.push('is_completed = ?');
    const params = [...Object.values(data), isCompleted ? 1 : 0, candidateId];
    if (sets.length) {
      await pool.query(`UPDATE candidate_kyc SET ${sets.join(', ')} WHERE candidate_id = ?`, params);
    }
  } else {
    const columnsList = ['candidate_id', ...Object.keys(data), 'is_completed'];
    const placeholders = columnsList.map(() => '?').join(', ');
    const params = [candidateId, ...Object.values(data), isCompleted ? 1 : 0];
    await pool.query(`INSERT INTO candidate_kyc (${columnsList.join(', ')}) VALUES (${placeholders})`, params);
  }

  return findByCandidateId(candidateId);
}

module.exports = { findByCandidateId, upsert };
