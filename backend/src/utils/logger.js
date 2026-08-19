// Minimal scrubbing logger — never logs sensitive fields.
const SENSITIVE_KEYS = new Set([
  'password', 'password_hash', 'pan_number', 'aadhaar_number',
  'token', 'authorization', 'capture_reference', 'signature',
  'photo', 'file', 'buffer',
]);

function scrub(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(scrub);
  if (typeof obj === 'object') {
    const out = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        out[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        out[key] = scrub(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }
  return obj;
}

function info(message, meta) {
  if (meta) {
    console.log(`[INFO] ${message}`, JSON.stringify(scrub(meta)));
  } else {
    console.log(`[INFO] ${message}`);
  }
}

function warn(message, meta) {
  if (meta) {
    console.warn(`[WARN] ${message}`, JSON.stringify(scrub(meta)));
  } else {
    console.warn(`[WARN] ${message}`);
  }
}

function error(message, meta) {
  if (meta) {
    console.error(`[ERROR] ${message}`, JSON.stringify(scrub(meta)));
  } else {
    console.error(`[ERROR] ${message}`);
  }
}

module.exports = { scrub, info, warn, error };
