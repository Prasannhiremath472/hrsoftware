// In-memory fake MySQL pool used by tests to avoid requiring a live database.
// Provides just enough behavior (query/getConnection/transactions) for the
// route logic under test to execute realistically.

const bcrypt = require('bcrypt');

function buildState() {
  return {
    users: [
      {
        id: 1,
        name: 'Test Admin',
        email: 'admin@test.local',
        password_hash: bcrypt.hashSync('Password123!', 4),
        role: 'SUPER_ADMIN',
        is_active: 1,
        last_login_at: null,
        created_at: '2026-01-01 00:00:00',
      },
    ],
    coordinators: [
      { id: 1, name: 'Coord One', mobile: '9000000001', email: 'coord1@test.local', employee_code: 'E1', location: 'Pune', status: 'ACTIVE', created_at: '2026-01-01 00:00:00', updated_at: '2026-01-01 00:00:00' },
    ],
    candidates: [],
    candidate_kyc: [],
    candidate_addresses: [],
    document_types: [
      { id: 1, name: 'Aadhaar Card', code: 'AADHAAR_CARD', is_mandatory: 1, is_active: 1, display_order: 1 },
      { id: 2, name: 'PAN Card', code: 'PAN_CARD', is_mandatory: 1, is_active: 1, display_order: 2 },
    ],
    candidate_documents: [],
    candidate_original_verification: [],
    candidate_photos: [],
    biometric_records: [],
    candidate_declarations: [],
    candidate_signatures: [],
    audit_logs: [],
    application_status_history: [],
    application_settings: [
      { setting_key: 'candidate_number_prefix', setting_value: 'CAN' },
      { setting_key: 'require_original_verification', setting_value: 'false' },
      { setting_key: 'require_biometric', setting_value: 'false' },
      { setting_key: 'require_signature', setting_value: 'false' },
      { setting_key: 'require_declaration', setting_value: 'false' },
    ],
    counters: [],
    login_otps: [],
    nextId: { candidates: 1, candidate_documents: 1, coordinators: 2, candidate_kyc: 1, candidate_addresses: 1, login_otps: 1 },
  };
}

let state = buildState();

function resetState() {
  state = buildState();
}

// Very small subset query "interpreter" tailored to the exact queries this
// codebase issues, matched by distinctive SQL fragments.
async function query(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim();

  // Auth
  if (s.startsWith('SELECT id, name, email, password_hash, role, is_active FROM users WHERE email')) {
    const user = state.users.find((u) => u.email === params[0]);
    return [user ? [user] : []];
  }
  if (s.startsWith('SELECT id, name, email, role, is_active FROM users WHERE id')) {
    const user = state.users.find((u) => u.id === params[0]);
    return [user ? [{ id: user.id, name: user.name, email: user.email, role: user.role, is_active: user.is_active }] : []];
  }
  if (s.startsWith('SELECT id, name, email, role, is_active, last_login_at, created_at FROM users WHERE id')) {
    const user = state.users.find((u) => u.id === params[0]);
    return [user ? [user] : []];
  }
  if (s.startsWith('UPDATE users SET last_login_at')) {
    return [{ affectedRows: 1 }];
  }

  // Login OTPs
  if (s.startsWith('UPDATE login_otps SET consumed_at = NOW() WHERE user_id')) {
    const userId = params[0];
    state.login_otps.filter((o) => o.user_id === userId && !o.consumed_at).forEach((o) => { o.consumed_at = '2026-01-01'; });
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('INSERT INTO login_otps')) {
    const [user_id, otp_hash, pre_auth_token, max_attempts, expires_at, ip_address] = params;
    const id = state.nextId.login_otps++;
    state.login_otps.push({
      id, user_id, otp_hash, pre_auth_token, attempts: 0, max_attempts,
      consumed_at: null, expires_at, ip_address, created_at: '2026-01-01',
    });
    return [{ insertId: id }];
  }
  if (s.startsWith('SELECT * FROM login_otps WHERE pre_auth_token')) {
    const r = state.login_otps.find((o) => o.pre_auth_token === params[0]);
    return [r ? [r] : []];
  }
  if (s.startsWith('UPDATE login_otps SET attempts = attempts + 1 WHERE id')) {
    const r = state.login_otps.find((o) => o.id === params[0]);
    if (r) r.attempts += 1;
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('UPDATE login_otps SET consumed_at = NOW() WHERE id')) {
    const r = state.login_otps.find((o) => o.id === params[0]);
    if (r) r.consumed_at = '2026-01-01';
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('SELECT user_id FROM login_otps')) {
    const r = state.login_otps.find((o) => o.pre_auth_token === params[0] && !o.consumed_at && new Date(o.expires_at).getTime() > Date.now());
    return [r ? [{ user_id: r.user_id }] : []];
  }

  // Audit logs / status history — accept and store
  if (s.startsWith('INSERT INTO audit_logs')) {
    state.audit_logs.push({ id: state.audit_logs.length + 1, params });
    return [{ insertId: state.audit_logs.length }];
  }
  if (s.startsWith('INSERT INTO application_status_history')) {
    state.application_status_history.push({ id: state.application_status_history.length + 1, params });
    return [{ insertId: state.application_status_history.length }];
  }

  // Settings
  if (s.startsWith('SELECT setting_key, setting_value FROM application_settings')) {
    return [state.application_settings];
  }
  if (s.startsWith('INSERT INTO application_settings')) {
    const [key, value] = params;
    const existing = state.application_settings.find((r) => r.setting_key === key);
    if (existing) existing.setting_value = value;
    else state.application_settings.push({ setting_key: key, setting_value: value });
    return [{ affectedRows: 1 }];
  }

  // Coordinators
  if (s.startsWith('INSERT INTO coordinators')) {
    const [name, mobile, email, employee_code, location, status] = params;
    const id = state.nextId.coordinators++;
    state.coordinators.push({ id, name, mobile, email, employee_code, location, status: status || 'ACTIVE', created_at: '2026-01-01', updated_at: '2026-01-01' });
    return [{ insertId: id }];
  }
  if (s.includes('FROM coordinators c') && s.includes('WHERE c.id = ?') && s.startsWith('SELECT c.*')) {
    const coord = state.coordinators.find((c) => c.id === params[0]);
    return [coord ? [{ ...coord, candidate_count: state.candidates.filter((c) => c.coordinator_id === coord.id).length }] : []];
  }
  if (s.startsWith('SELECT c.*') && s.includes('FROM coordinators c') && !s.includes('WHERE c.id')) {
    return [state.coordinators.map((c) => ({ ...c, candidate_count: 0 }))];
  }

  // Candidate number counters
  if (s.startsWith('INSERT INTO counters')) {
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('SELECT current_value FROM counters')) {
    const key = params[0];
    let counter = state.counters.find((c) => c.counter_key === key);
    if (!counter) {
      counter = { counter_key: key, current_value: 0 };
      state.counters.push(counter);
    }
    return [[{ current_value: counter.current_value }]];
  }
  if (s.startsWith('UPDATE counters SET current_value')) {
    const [value, key] = params;
    const counter = state.counters.find((c) => c.counter_key === key);
    if (counter) counter.current_value = value;
    return [{ affectedRows: 1 }];
  }

  // Candidates
  if (s.startsWith('INSERT INTO candidates')) {
    const [candidate_number, full_name, mobile, email, dob, gender, coordinator_id, created_by] = params;
    const id = state.nextId.candidates++;
    state.candidates.push({
      id, candidate_number, full_name, mobile, email, dob, gender,
      coordinator_id, status: 'DRAFT', current_step: 'REGISTRATION',
      submitted_at: null, created_by, created_at: '2026-01-01', updated_at: '2026-01-01',
    });
    return [{ insertId: id }];
  }
  if (s === 'SELECT * FROM candidates WHERE id = ?') {
    const c = state.candidates.find((x) => x.id === Number(params[0]));
    return [c ? [c] : []];
  }
  if (s.startsWith('SELECT c.*, co.name AS coordinator_name, co.status AS coordinator_status')) {
    const c = state.candidates.find((x) => x.id === Number(params[0]));
    if (!c) return [[]];
    const coord = state.coordinators.find((co) => co.id === c.coordinator_id);
    return [[{ ...c, coordinator_name: coord?.name, coordinator_status: coord?.status }]];
  }
  if (s.startsWith('SELECT c.*, co.name AS coordinator_name') && s.includes('FROM candidates c') && s.includes('LIMIT')) {
    return [state.candidates.map((c) => ({ ...c, coordinator_name: state.coordinators.find((co) => co.id === c.coordinator_id)?.name }))];
  }
  if (s.startsWith('SELECT COUNT(*) AS total FROM candidates')) {
    return [[{ total: state.candidates.length }]];
  }
  if (s.startsWith('UPDATE candidates SET coordinator_id')) {
    const [coordinatorId, id] = params;
    const c = state.candidates.find((x) => x.id === Number(id));
    if (c) c.coordinator_id = coordinatorId;
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('UPDATE candidates SET current_step')) {
    const [step, id] = params;
    const c = state.candidates.find((x) => x.id === Number(id));
    if (c) c.current_step = step;
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('SELECT status FROM candidates WHERE id')) {
    const c = state.candidates.find((x) => x.id === Number(params[0]));
    return [c ? [{ status: c.status }] : []];
  }
  if (s.startsWith('UPDATE candidates SET status = ? WHERE id')) {
    const [status, id] = params;
    const c = state.candidates.find((x) => x.id === Number(id));
    if (c) c.status = status;
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('UPDATE candidates SET status = ?, current_step')) {
    const [status, step, id] = params;
    const c = state.candidates.find((x) => x.id === Number(id));
    if (c) { c.status = status; c.current_step = step; c.submitted_at = '2026-01-01'; }
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('UPDATE candidates SET') && s.includes('WHERE id = ?')) {
    const id = params[params.length - 1];
    const c = state.candidates.find((x) => x.id === Number(id));
    return [{ affectedRows: c ? 1 : 0 }];
  }

  // KYC
  if (s.startsWith('SELECT * FROM candidate_kyc WHERE candidate_id')) {
    const k = state.candidate_kyc.find((x) => x.candidate_id === Number(params[0]));
    return [k ? [k] : []];
  }
  if (s.startsWith('INSERT INTO candidate_kyc')) {
    const id = state.nextId.candidate_kyc++;
    const columnsMatch = /INSERT INTO candidate_kyc \(([^)]+)\)/.exec(s);
    const columns = columnsMatch ? columnsMatch[1].split(',').map((c) => c.trim()) : [];
    const row = { id };
    columns.forEach((col, idx) => { row[col] = params[idx]; });
    state.candidate_kyc.push(row);
    return [{ insertId: id }];
  }
  if (s.startsWith('UPDATE candidate_kyc SET')) {
    const candidateId = params[params.length - 1];
    let k = state.candidate_kyc.find((x) => x.candidate_id === Number(candidateId));
    if (!k) {
      k = { id: state.nextId.candidate_kyc++, candidate_id: Number(candidateId) };
      state.candidate_kyc.push(k);
    }
    k.is_completed = params[params.length - 2];
    k.applicant_name = 'Test Applicant';
    k.pan_number = 'ABCDE1234F';
    k.aadhaar_number = '123412341234';
    return [{ affectedRows: 1 }];
  }

  // Address
  if (s.startsWith('SELECT * FROM candidate_addresses WHERE candidate_id')) {
    const a = state.candidate_addresses.find((x) => x.candidate_id === Number(params[0]));
    return [a ? [a] : []];
  }
  if (s.startsWith('INSERT INTO candidate_addresses')) {
    const id = state.nextId.candidate_addresses++;
    const columnsMatch = /INSERT INTO candidate_addresses \(([^)]+)\)/.exec(s);
    const columns = columnsMatch ? columnsMatch[1].split(',').map((c) => c.trim()) : [];
    const row = { id };
    columns.forEach((col, idx) => { row[col] = params[idx]; });
    state.candidate_addresses.push(row);
    return [{ insertId: id }];
  }
  if (s.startsWith('UPDATE candidate_addresses SET')) {
    const candidateId = params[params.length - 1];
    let a = state.candidate_addresses.find((x) => x.candidate_id === Number(candidateId));
    if (!a) {
      a = { id: state.nextId.candidate_addresses++, candidate_id: Number(candidateId) };
      state.candidate_addresses.push(a);
    }
    a.is_completed = params[params.length - 2];
    return [{ affectedRows: 1 }];
  }

  // Document types
  if (s.startsWith('SELECT * FROM document_types')) {
    return [state.document_types];
  }
  if (s.startsWith('SELECT * FROM document_types WHERE id')) {
    const t = state.document_types.find((x) => x.id === Number(params[0]));
    return [t ? [t] : []];
  }

  // Documents
  if (s.startsWith('INSERT INTO candidate_documents')) {
    const [candidate_id, document_type_id, stored_filename, original_filename, mime_type, file_size_bytes, storage_path, uploaded_by] = params;
    const id = state.nextId.candidate_documents++;
    state.candidate_documents.push({
      id, candidate_id, document_type_id, stored_filename, original_filename, mime_type,
      file_size_bytes, storage_path, status: 'UPLOADED', uploaded_by, reject_reason: null,
      reject_comment: null, verified_by: null, verified_at: null, created_at: '2026-01-01',
    });
    return [{ insertId: id }];
  }
  if (s.startsWith('SELECT d.*, dt.name AS document_type_name') && s.includes('WHERE d.id')) {
    const d = state.candidate_documents.find((x) => x.id === Number(params[0]));
    if (!d) return [[]];
    const type = state.document_types.find((t) => t.id === d.document_type_id);
    return [[{ ...d, document_type_name: type?.name, document_type_code: type?.code, is_mandatory: type?.is_mandatory }]];
  }
  if (s.startsWith('SELECT d.*, dt.name AS document_type_name') && s.includes('WHERE d.candidate_id')) {
    const docs = state.candidate_documents.filter((x) => x.candidate_id === Number(params[0]));
    return [docs.map((d) => {
      const type = state.document_types.find((t) => t.id === d.document_type_id);
      return { ...d, document_type_name: type?.name, document_type_code: type?.code, is_mandatory: type?.is_mandatory };
    })];
  }
  if (s.startsWith('UPDATE candidate_documents SET status = \'VERIFIED\'')) {
    const [verified_by, id] = params;
    const d = state.candidate_documents.find((x) => x.id === Number(id));
    if (d) { d.status = 'VERIFIED'; d.verified_by = verified_by; }
    return [{ affectedRows: 1 }];
  }
  if (s.startsWith('UPDATE candidate_documents SET status = \'REJECTED\'')) {
    const [verified_by, reason, comment, id] = params;
    const d = state.candidate_documents.find((x) => x.id === Number(id));
    if (d) { d.status = 'REJECTED'; d.verified_by = verified_by; d.reject_reason = reason; d.reject_comment = comment; }
    return [{ affectedRows: 1 }];
  }

  // Original verification / photo / biometric / declaration / signature — minimal support
  if (s.includes('candidate_original_verification')) {
    if (s.startsWith('SELECT')) {
      const r = state.candidate_original_verification.find((x) => x.candidate_id === Number(params[0]));
      return [r ? [r] : []];
    }
    return [{ affectedRows: 1, insertId: 1 }];
  }
  if (s.includes('candidate_photos')) {
    if (s.startsWith('SELECT')) {
      const r = state.candidate_photos.find((x) => x.candidate_id === Number(params[0]));
      return [r ? [r] : []];
    }
    if (s.startsWith('INSERT')) {
      const [candidate_id, stored_filename, storage_path, mime_type, captured_by] = params;
      state.candidate_photos.push({ id: state.candidate_photos.length + 1, candidate_id, stored_filename, storage_path, mime_type, captured_by, captured_at: '2026-01-01' });
      return [{ insertId: state.candidate_photos.length, affectedRows: 1 }];
    }
    if (s.startsWith('UPDATE')) {
      const [stored_filename, storage_path, mime_type, captured_by, candidate_id] = params;
      const r = state.candidate_photos.find((x) => x.candidate_id === Number(candidate_id));
      if (r) Object.assign(r, { stored_filename, storage_path, mime_type, captured_by });
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 1, insertId: 1 }];
  }
  if (s.includes('biometric_records')) {
    if (s.startsWith('SELECT')) {
      const rows = state.biometric_records.filter((x) => x.candidate_id === Number(params[0]));
      return [rows];
    }
    return [{ affectedRows: 1, insertId: 1 }];
  }
  if (s.includes('candidate_declarations')) {
    if (s.startsWith('SELECT')) {
      const r = state.candidate_declarations.find((x) => x.candidate_id === Number(params[0]));
      return [r ? [r] : []];
    }
    return [{ affectedRows: 1, insertId: 1 }];
  }
  if (s.includes('candidate_signatures')) {
    if (s.startsWith('SELECT')) {
      const r = state.candidate_signatures.find((x) => x.candidate_id === Number(params[0]));
      return [r ? [r] : []];
    }
    return [{ affectedRows: 1, insertId: 1 }];
  }

  // Default fallback — empty result set
  return [[]];
}

const fakeConnection = {
  query,
  async beginTransaction() {},
  async commit() {},
  async rollback() {},
  release() {},
};

const fakePool = {
  query,
  async getConnection() {
    return fakeConnection;
  },
  async end() {},
};

async function withTransaction(callback) {
  return callback(fakeConnection);
}

module.exports = { fakePool, withTransaction, resetState, state: () => state };
