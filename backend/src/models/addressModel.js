const { pool } = require('../db/pool');

async function findByCandidateId(candidateId) {
  const [rows] = await pool.query('SELECT * FROM candidate_addresses WHERE candidate_id = ? LIMIT 1', [candidateId]);
  return rows[0] || null;
}

async function upsert(candidateId, fields) {
  const existing = await findByCandidateId(candidateId);
  const columns = [
    'residence_address', 'residence_pin_code', 'contact_email', 'contact_mobile',
    'proof_of_address', 'same_as_residence', 'permanent_address', 'permanent_pin_code',
  ];
  const map = {
    residenceAddress: 'residence_address',
    residencePinCode: 'residence_pin_code',
    contactEmail: 'contact_email',
    contactMobile: 'contact_mobile',
    proofOfAddress: 'proof_of_address',
    sameAsResidence: 'same_as_residence',
    permanentAddress: 'permanent_address',
    permanentPinCode: 'permanent_pin_code',
  };

  const data = {};
  for (const [key, value] of Object.entries(fields)) {
    const column = map[key] || key;
    if (columns.includes(column)) {
      data[column] = column === 'same_as_residence' ? (value ? 1 : 0) : value;
    }
  }

  const sameAsResidence = data.same_as_residence !== undefined ? data.same_as_residence : existing?.same_as_residence;
  const residenceAddress = data.residence_address !== undefined ? data.residence_address : existing?.residence_address;
  const residencePin = data.residence_pin_code !== undefined ? data.residence_pin_code : existing?.residence_pin_code;
  const permanentAddress = sameAsResidence ? residenceAddress : (data.permanent_address !== undefined ? data.permanent_address : existing?.permanent_address);
  const permanentPin = sameAsResidence ? residencePin : (data.permanent_pin_code !== undefined ? data.permanent_pin_code : existing?.permanent_pin_code);

  if (sameAsResidence) {
    data.permanent_address = permanentAddress;
    data.permanent_pin_code = permanentPin;
  }

  const isCompleted = Boolean(
    residenceAddress && residencePin && (data.proof_of_address || existing?.proof_of_address) && (permanentAddress && permanentPin)
  );

  if (existing) {
    const sets = Object.keys(data).map((c) => `${c} = ?`);
    sets.push('is_completed = ?');
    const params = [...Object.values(data), isCompleted ? 1 : 0, candidateId];
    if (sets.length) {
      await pool.query(`UPDATE candidate_addresses SET ${sets.join(', ')} WHERE candidate_id = ?`, params);
    }
  } else {
    const columnsList = ['candidate_id', ...Object.keys(data), 'is_completed'];
    const placeholders = columnsList.map(() => '?').join(', ');
    const params = [candidateId, ...Object.values(data), isCompleted ? 1 : 0];
    await pool.query(`INSERT INTO candidate_addresses (${columnsList.join(', ')}) VALUES (${placeholders})`, params);
  }

  return findByCandidateId(candidateId);
}

module.exports = { findByCandidateId, upsert };
