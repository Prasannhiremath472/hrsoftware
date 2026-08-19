const { pool } = require('../db/pool');

const DEFAULTS = {
  candidate_number_prefix: 'CAN',
  max_file_size_mb: '10',
  require_original_verification: 'true',
  require_biometric: 'true',
  require_signature: 'true',
  require_declaration: 'true',
};

async function getAll() {
  const [rows] = await pool.query('SELECT setting_key, setting_value FROM application_settings');
  const map = { ...DEFAULTS };
  for (const row of rows) map[row.setting_key] = row.setting_value;
  return map;
}

async function getOne(key) {
  const all = await getAll();
  return all[key];
}

async function setMany(entries) {
  const keys = Object.keys(entries);
  if (!keys.length) return getAll();
  for (const key of keys) {
    await pool.query(
      `INSERT INTO application_settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [key, String(entries[key])]
    );
  }
  return getAll();
}

function asBool(value) {
  return String(value).toLowerCase() === 'true';
}

module.exports = { getAll, getOne, setMany, asBool, DEFAULTS };
